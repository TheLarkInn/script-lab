import { Component, OnInit, ApplicationRef } from '@angular/core';
import { Storage } from '@microsoft/office-js-helpers';
import { SnippetStore, Snippet, Notification, Events, GalleryEvents, Disposable } from '../shared/services';
import * as _ from 'lodash';
import './gallery.view.scss';

@Component({
    selector: 'gallery-view',
    templateUrl: 'gallery.view.html'
})
export class GalleryView extends Disposable implements OnInit {
    snippets: ISnippet[] = [];
    templates: IPlaylist = {} as any;
    hideWarn: boolean;
    private _store: Storage<string>;

    constructor(
        private _appRef: ApplicationRef,
        private _snippetStore: SnippetStore,
        private _notification: Notification,
        private _events: Events
    ) {
        super();
        this._store = new Storage<string>('Playground');
        this.hideWarn = this._store.get('LocalStorageWarn') as any || false;
    }

    async ngOnInit() {
        this.snippets = this._snippetStore.local();
        this.templates = await this._snippetStore.templates();
        let subscription = this._notification.on<ISnippet>('StorageEvent')
            .debounceTime(400)
            .subscribe(items => {
                this.snippets = this._snippetStore.local();
            });

        this.markDispose(subscription);
    }

    async delete(snippet: ISnippet) {
        let result = await this._notification.showDialog('Are you sure you want to delete your snippet?', `Delete '${snippet.name}'`, 'Delete', 'Keep')
        if (result === 'Keep') {
            throw 'Keep data';
        }
        if (this._store.get('LastOpened') === snippet.id) {
            return this._store.remove('LastOpened');
        }

        await this._snippetStore.delete(snippet);
        this._events.emit('GalleryEvents', GalleryEvents.DELETE, snippet);
    }

    async deleteAll() {
        let result = await this._notification.showDialog('Are you sure you want to delete all your local snippets?', 'Delete All', 'Delete all', 'Keep them');
        if (result === 'Keep them') {
            return;
        }

        await this._snippetStore.clear();
        this._store.remove('LastOpened');
        this._events.emit('GalleryEvents', GalleryEvents.DELETE_ALL, null);
    }

    toggleWarn() {
        this.hideWarn = !this.hideWarn;
        this._store.insert('LocalStorageWarn', this.hideWarn as any);
    }

    new() {
        this._events.emit('GalleryEvents', GalleryEvents.CREATE, null);
    }

    copy(snippet: ISnippet) {
        this._events.emit('GalleryEvents', GalleryEvents.COPY, snippet);
    }

    select(snippet: ISnippet) {
        this._events.emit('GalleryEvents', GalleryEvents.SELECT, snippet);
    }

    import(id: string) {
        this._events.emit('GalleryEvents', GalleryEvents.IMPORT, id);
    }

    commandEvents($event: any) {
        if ($event.title === 'Local') {
            switch ($event.action) {
                case 'Info': return Promise.resolve(this.toggleWarn());
                case 'Delete': return this.deleteAll();
            }
        }
    }
}
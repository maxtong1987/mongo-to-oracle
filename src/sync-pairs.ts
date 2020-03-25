import { IOptionTable, ISrcDestPair } from "./models";
import { splitPair } from "./pairs-common";
import { ISyncOptions } from "./synchronizer";

export class SyncPairs extends Array<ISrcDestPair<ISyncOptions>> {
    constructor(tables: Array<IOptionTable<ISyncOptions>>, defaultOptions: ISyncOptions) {
        super();
        for (const table of tables) {
            const pair = splitPair(table);
            const src = pair[0];
            const dest = pair[1];
            const options = table.options || defaultOptions;
            this.push({ src, dest, options });
        }
    }
}

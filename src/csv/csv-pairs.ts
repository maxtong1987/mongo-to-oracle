import { IOptionTable, ISrcDestPair } from "../models";
import { splitPair } from "../pairs-common";
import { ICsvOptions } from "./csv-inserter";

export class CsvPairs extends Array<ISrcDestPair<ICsvOptions>> {
    constructor(tables: Array<IOptionTable<ICsvOptions>>, defaultOptions: ICsvOptions) {
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

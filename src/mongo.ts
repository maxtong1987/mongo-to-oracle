import { MongoClient, MongoClientOptions } from "mongodb";
import { Logger } from "./loggers/logger";

export class Mongo {

    get url() {
        return this._url;
    }

    get options(): MongoClientOptions | undefined {
        return this._options;
    }

    get connection(): MongoClient {
        return this._connection;
    }

    private _url: string;
    private _options: MongoClientOptions | undefined;
    private _connection: MongoClient;

    constructor(url: string, options?: MongoClientOptions) {
        this._url = url;
        this._options = options;
        this._connection = new MongoClient(url, options);
    }

    public async connect(): Promise<MongoClient> {
        if (this._connection.isConnected()) {
            return this._connection;
        }
        Logger.info(`Mongo: Connecting to ${this._url}`);
        await this._connection.connect();
        Logger.info("Mongo: Connected.");
        return this._connection;
    }
}

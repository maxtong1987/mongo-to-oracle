import oracledb from "oracledb";
import { Logger } from "./loggers/logger";

export class Oracle {

  public get connection() {
    return this._connection;
  }

  public get config() {
    return this._config;
  }

  private _connection: oracledb.Connection | undefined;
  private _config: oracledb.ConnectionAttributes;

  constructor(config: oracledb.ConnectionAttributes) {
    this._config = config;
  }

  public async connect(): Promise<oracledb.Connection> {
    if (this._connection !== undefined) {
      return this._connection;
    }
    Logger.info(`Oracle: Connecting to ${this._config.connectString}`);
    this._connection = await oracledb.getConnection(this._config);
    Logger.info("Oracle: Connected.");
    return this._connection;
  }
}

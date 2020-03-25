import { MongoClient } from "mongodb";
import { Connection } from "oracledb";

export interface IDbConnections {
    mongo: MongoClient;
    oracle: Connection;
}
# mongo-to-oracle

The is a node.js server that synchronizes part of mongo database with oracle database. It listens to a target mongo replica and does insert, update and delete on a target oracle database accordingly. Please bear in mind that the server is NOT for data-migration purpose.

- [mongo-to-oracle](#mongo-to-oracle)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Build](#build)
  - [Launch Oracle And Mongo Database](#launch-oracle-and-mongo-database)
  - [Run](#run)
  - [Configuration](#configuration)
    - [Connections](#connections)
    - [Log](#log)
    - [Synchronizer](#synchronizer)
      - [Syntax for `mongo->oracle`](#syntax-for-mongo-oracle)
    - [CsvInserter](#csvinserter)

## Prerequisites

- [node.js](https://nodejs.org/en/)

- [Oracle Instant Client](https://www.oracle.com/technetwork/database/database-technologies/instant-client/downloads/index.html)

- [docker](https://www.docker.com/) for launching mongodb and oracledb

## Installation

```sh
npm install
```

## Environment Variables

- CONFIG_FILE - Optional. Full path for config file.
- RESUME_TOKEN_FILE - Optional. Full path for resume token file. Resume token file needs read and write permission.
- LOG_PATH - default value is `.log`. The full path where log files are stored into.

## Build

all compiled .js file will be stored in [./dist](./dist)

```sh
npm build
# or for development (keep watching changes)
npm build:watch
```

## Launch Oracle And Mongo Database

```sh
docker-compose up -d
```

## Run

```sh
npm start
```

## Configuration

modify [./src/config.json](./src/config.json) by using any kind of text editor.

### Connections

- `mongo` : define the mongodb connection configuration. This is the source database.
- `oracle` : define the oracledb connection configuration. This is the destination database.

### Log

- `level` : minimum level that logger should record into file. acceptable values: `debug` | `info` | `warning` | `error`
- `files` : take a look at [this](https://github.com/winstonjs/winston-daily-rotate-file) for detail

### Synchronizer

| property|description|
|---|---|
| `db`| database name for mongodb|
| `defaultOptions`| define the default `options` values for each `mongo->oracle` if it doesn't provided any.|
| `defaultOptions.isSyncOnStart`| set to true if you want to copy all documents of the current table from mongo to oracle when server start.|
| `defaultOptions.isSyncInRealTime` | set to true if you want to listen to the changes of the current table do synchronization in real-time.|
| `mongo->oracle`| define tables and columns to be synchronized from mongodb to oracledb. the syntax for `table`, `keys` and `columns` must be "source->destination" (see [Syntax for `mongo->oracle`](#Syntax-for-mongo-oracle)) |

#### Syntax for `mongo->oracle`

`mongo->oracle` define a list of table object

```json
"mongo->oracle":[
  // simple case
  {
    "table": "simple_collection->SIMPLE_COLLECTION",
    "keys": [
      "_id->ID"
    ],
    "columns": [
      "a->A",
      "b->B"
      ],
  },
  // with constant value
  {
    "table": "collection_with_constant->TABLE_WITH_CONSTANT",
    "keys": [
      "_id->ID"
    ],
    "columns": [
      "a->A",
      "'const_value'->CONSTANT_VALUE" // constant column
      ],
  },
  // with composite key
  {
    "table": "collection_with_compo_key->TABLE_WITH_COMPO_KEY",
    "keys": [
      // the key in mongo is "_id: { a, b }"
      "_id.a->ID_A", // you can use "." to retrieve embedded document values
      "_id.b->ID_B"
    ],
    "columns": [
      "a->A",
      "b->b"
      ],
  },
  // with default value
  {
    "table": "collection_with_default_value->TABLE_WITH_DEFAULT_VALUE",
    "keys": [
      "_id->ID"
    ],
    "columns": [
      "a->A",
      "b?'default'->B", // if b = null, then return 'default'
      "c?b?'default'->C" // if c == null, then b, if b == null, then 'default'
      ],
  },
  // with constant key value
  {
    "table": "collection_with_const_key->TABLE_WITH_CONST_KEY",
    "keys": [
      "_id->ID_A",
      "'const_value'->ID_B" // always use 'const_value' for ID_B
    ],
    "columns": [
      "a->A",
      "b->B"
    ]
  },
  // with embedded document
  {
    "table": "parent_collection->PARENT_TABLE",
    "keys": [
      "_id->ID"
    ],
    "columns": [
      "a->A",
      "b->B"
    ],
    "embeddedColumns": [
      {
        "table": "embedded_doc->CHILD_TABLE",
        "keys": [
          "../_id->PARENT_ID", // "../_id" points to parent_collection._id
          "_id->CHILD_ID"
        ],
        "columns": [
          "a->A",
          "b->B"
        ]
      }
    ]
  },
  // with primitive type embedded document (e.g. string, number type)
  {
    "table": "parent_collection_2->PARENT_TABLE_2",
    "keys": [
      "_id->ID"
    ],
    "columns": [
      "a->A",
      "b->B"
    ],
    "embeddedColumns": [
      {
        "table": "embedded_doc->CHILD_TABLE",
        "keys": [
          "../_id->PARENT_ID",
          ".->CHILD_ID" // "." is the value of embedded_doc
        ],
        // because the embedded document is primitive type, there will be no columns
        "columns": []
      }
    ]
  }
]

```

### CsvInserter

TODO

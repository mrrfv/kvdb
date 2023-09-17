// Sets up the database with the required tables and data

import pg from "pg";
import "dotenv/config";

const client = new pg.Client({
    connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

// Connect to Postgres
client.connect();

if (process.env.DANGEROUS_DELETE_TABLE) {
    // Delete the keys table
    client.query(`
        DROP TABLE IF EXISTS keys;
    `, (err, res) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Table deleted successfully.");
        }
    });
}

// Create the keys table
client.query(`
    CREATE TABLE IF NOT EXISTS keys (
        name TEXT PRIMARY KEY NOT NULL,
        roname TEXT,
        value TEXT,
        last_accessed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
`, (err, res) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Data created successfully, you can now run the server.");
    }

    // Now close the connection
    client.end();
});
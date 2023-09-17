# kvdb

Very simple postgres-based key-value database server.

## Why?

Firebase, Appwrite, Supabase and other similar services have limited free plans, usually based around the amount of daily reads, writes or simultaneous connections. This is a problem for projects with no budget that need to store a small amount of data that is accessed or modified very frequently.

By using this project, you can host your own key-value database server, with no limits on reads, writes or connections. The only limit is the amount of storage space available on your server.

## Features

- Very simple API - create, update, read and delete - that's it
- Meant to be directly connected to from the client, no additional backend needed
- **No authentication (key name is considered secret)** - please keep this in mind when using this project
- Optional response speed throttling
- Optional key expiration
- Key/value length limits
- Read-only keys that respond with the same value but don't allow writes
- CORS support

## Usage

### Requirements

- PostgreSQL database
- Node.js 18+ and npm

### Installation

1. Clone this repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and edit it to match your database configuration
4. Run `node db-setup.js` to create the database table. Define the `DANGEROUS_DELETE_TABLE` environment variable to delete the existing table first (this will delete all data).
5. Run `node index.js` to start the server

### HTTP API

#### GET /key?name=KEY_NAME

Returns the value of the key `KEY_NAME`.

**Response example:**

```json
{
  "value": "Hello, world!"
}
```

#### POST /key

**Request body:**

```json
{
  "name": "Optional key name"
}
```

**Response example:**

```json
{
  "success": true,
  "name": "Key name",
  "name_readonly": "Read-only key name",
}
```

Creates a key. An optional key name can be specified in a `name` JSON parameter. If no name is specified, a secure random string will be used. The key name must contain no spaces or special characters. `name_readonly` is the name of the read-only key that is created alongside the regular key.

If a key is invalid, the server will generate a new key name and return it in the response.

#### PATCH /key

**Request body:**

```json
{
  "name": "Key name",
  "value": "New value"
}
```

**Response example:**

```json
{
  "success": true
}
```

Updates the value of the key `namme` to `value`.

#### DELETE /key?name=KEY_NAME

**Response example:**

```json
{
  "success": true
}
```

Deletes the key `KEY_NAME`.

## Important

This is a very simple project that was created for personal use. There is no guarantee that it is secure or that it will work for your use case. Use at your own risk.

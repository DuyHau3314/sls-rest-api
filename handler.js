"use strict";
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const ddDocClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.NOTES_TABLE_NAME;

module.exports.createNote = async (event) => {
  let data = JSON.parse(event.body);

  try {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        noteId: crypto.randomUUID(),
        title: data.title,
        content: data.content,
      },
      ConditionExpression: "attribute_not_exists(noteId)",
    };
    await ddDocClient.send(new PutCommand(params));

    return {
      statusCode: 201,
      body: JSON.stringify(
        {
          message: "Note created successfully",
        },
        null,
        2
      ),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify(
        {
          message: error.message,
        },
        null,
        2
      ),
    };
  }
};

module.exports.updateNote = async (event) => {
  const noteId = event.pathParameters.id;

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Request body is required" }),
      };
    }

    const data = JSON.parse(event.body);

    if (!data.title || !data.content) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Both title and content are required.",
        }),
      };
    }

    const params = {
      TableName: TABLE_NAME,
      Key: { noteId },
      UpdateExpression: "set title = :title, content = :content",
      ExpressionAttributeValues: {
        ":title": data.title,
        ":content": data.content,
      },
      ConditionExpression: "attribute_exists(noteId)",
    };

    await ddDocClient.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Note updated successfully" }),
    };
  } catch (error) {
    console.error("Error updating note:", error);

    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Note not found" }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

module.exports.deleteNote = async (event) => {
  const noteId = event.pathParameters.id;

  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { noteId },
      ConditionExpression: "attribute_exists(noteId)",
    };

    await ddDocClient.send(new DeleteCommand(params));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Note deleted successfully" }),
    };
  } catch (error) {
    console.error("Error deleting note:", error);

    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Note not found" }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

module.exports.getAllNotes = async (event) => {
  console.log("Fetching all notes from table:", TABLE_NAME);

  try {
    const params = {
      TableName: TABLE_NAME,
    };

    const { Items } = await ddDocClient.send(new ScanCommand(params));

    return {
      statusCode: 200,
      body: JSON.stringify(Items),
    };
  } catch (error) {
    console.error("Error retrieving notes:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

module.exports.getNote = async (event) => {
  const noteId = event.pathParameters.id;
  console.log("Received request for noteId:", noteId);
  console.log("Using table:", TABLE_NAME);

  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { noteId },
    };

    const { Item } = await ddDocClient.send(new GetCommand(params));

    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Note not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(Item),
    };
  } catch (error) {
    console.error("Error retrieving note:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

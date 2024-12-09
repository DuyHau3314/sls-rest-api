const { CognitoJwtVerifier } = require("aws-jwt-verify");

const COGNITO_USERPOOL_ID = process.env.COGNITO_USERPOOL_ID;
const COGNITO_WEB_CLIENT_ID = process.env.COGNITO_WEB_CLIENT_ID;

const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: COGNITO_USERPOOL_ID,
  tokenUse: "id",
  clientId: COGNITO_WEB_CLIENT_ID,
});

const generatePolicy = (principeId, effect, resource) => {
  const authResponse = {};

  authResponse.principalId = principeId;
  if (effect && resource) {
    let policyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    };
    authResponse.policyDocument = policyDocument;
  }

  authResponse.context = {
    foo: "bar",
  };

  console.log("authResponse", JSON.stringify(authResponse));

  return authResponse;
};

exports.handler = async (event, context, callback) => {
  const token = event.authorizationToken; //allow or deny

  console.log("======token", token);

  try {
    const payload = await jwtVerifier.verify(token);

    console.log("======payload", payload);

    callback(null, generatePolicy("user", "Allow", event.methodArn));
  } catch (error) {
    callback("Error: Invalid token");
  }
};

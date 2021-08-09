// src/index.ts
import express from "express";
import Shopify, { ApiVersion, AuthQuery } from "@shopify/shopify-api";
require("dotenv").config();
const fs = require("fs");
import bodyParser from "body-parser";

const app = express();

app.use(express.static("public"));
app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

const { API_KEY, API_SECRET_KEY, SCOPES, SHOP, HOST } = process.env;
Shopify.Context.initialize({
  API_KEY,
  API_SECRET_KEY,
  SCOPES: [SCOPES],
  HOST_NAME: process.env.HOST.replace(/https:\/\//, ""),
  IS_EMBEDDED_APP: true,
  API_VERSION: ApiVersion.October20, // all supported versions are available, as well as "unstable" and "unversioned"
});

// the rest of the example code goes here

app.get("/login", async (req, res) => {
  let authRoute = await Shopify.Auth.beginAuth(
    req,
    res,
    SHOP,
    "/auth/callback",
    true
  );
  console.log("auth route", authRoute);
  return res.redirect(authRoute);
});

app.get("/auth/callback", async (req, res) => {
  console.log("merchant is redirected", "validating auth callback");
  try {
    await Shopify.Auth.validateAuthCallback(
      req,
      res,
      req.query as unknown as AuthQuery
    ); // req.query must be cast to unkown and then AuthQuery in order to be accepted
    const session = await Shopify.Utils.loadCurrentSession(req, res);
    console.log("session", session);

    fs.writeFile("./access_token.txt", session.accessToken, (err: any) => {
      if (err) {
        console.error(err);
        return;
      }
      //file written successfully
    });
  } catch (error) {
    console.error(error); // in practice these should be handled more gracefully
  }
  return res.redirect(HOST); // wherever you want your user to end up after OAuth completes
});

app.get("/get-session", async (req, res) => {
  try {
    const session = await Shopify.Utils.loadCurrentSession(req, res);
    console.log("session", session);

    fs.writeFile("./access_token.txt", session.accessToken, (err: any) => {
      if (err) {
        console.error(err);
        return;
      }
      //file written successfully
    });
  } catch (error) {
    console.log("error", error);
  }
});

app.get("/show-products", async () => {
  let accessToken;
  fs.readFile("./access_token.txt", "utf8", async (err: any, data: any) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(data);
    accessToken = data;

    const client = new Shopify.Clients.Graphql(SHOP, data);
    // Use client.query and pass your query as `data`
    const products = await client.query({
      data: `{
      products (first: 10) {
        edges {
          node {
            id
            title
            descriptionHtml
          }
        }
      }
    }`,
    });
    console.log("products ", products);
  });
});

app.get("/set-script", async (req, res) => {
  try {
    fs.readFile("./access_token.txt", "utf8", async (err: any, data: any) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log(data);
      const accessToken = data;

      const client = new Shopify.Clients.Graphql(SHOP, accessToken);

      // const scriptLocation = `${HOST}/build/static/js/2.fb3154cb.chunk.js`;
      const scriptLocation = `${HOST}/basic.js`;
      const script = await client.query({
        data: `
        mutation {
          scriptTagCreate(input:{src: "${HOST}/bundle.js", displayScope: ALL}){
            scriptTag{
              src
              displayScope
            } 
          }
        }
      `,
      });
      console.log("script res", script.body);
    });
  } catch (error) {
    console.log("error", error);
  }
});

app.get("/get-scripts", async (req, res) => {
  try {
    fs.readFile("./access_token.txt", "utf8", async (err: any, data: any) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log(data);
      const accessToken = data;
      const client = new Shopify.Clients.Graphql(SHOP, accessToken);

      const script = await client.query({
        data: `
      {
        scriptTags(first:100){
          edges{
            node{
               src
               id
            }
          }
        }
      }
      `,
      });
      console.log("script tags", (script.body as any).data.scriptTags.edges);
    });
  } catch (error) {
    console.log("error", error);
  }
});

app.post("/delete-script", async (req, res) => {
  console.log("req", req.body);
  try {
    const accessToken = fs.readFileSync("./access_token.txt", "utf8");

    const client = new Shopify.Clients.Graphql(SHOP, accessToken);

    const script = await client.query({
      data: `
      mutation {
        scriptTagDelete(id: "${req.body.id}"){
          deletedScriptTagId
          userErrors {
            field
            message
          }
        }
      }
      `,
    });

    console.log("delted script", script);
    res.send(script);
  } catch (error) {
    console.log("err", error);
    res.send(error);
  }
});

app.listen(3000, () => {
  console.log("your app is now listening on port 3000");
});

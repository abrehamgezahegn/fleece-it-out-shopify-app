// src/index.ts
import express from "express";
import Shopify, { ApiVersion, AuthQuery } from "@shopify/shopify-api";
require("dotenv").config();

const app = express();

const { API_KEY, API_SECRET_KEY, SCOPES, SHOP, HOST } = process.env;
console.log("host", HOST);
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
  try {
    await Shopify.Auth.validateAuthCallback(
      req,
      res,
      req.query as unknown as AuthQuery
    ); // req.query must be cast to unkown and then AuthQuery in order to be accepted
  } catch (error) {
    console.error(error); // in practice these should be handled more gracefully
  }
  return res.redirect("https://2071d183db0f.ngrok.io"); // wherever you want your user to end up after OAuth completes
});

app.get("/get-session", async (req, res) => {
  try {
    const session = await Shopify.Utils.loadCurrentSession(req, res);
    console.log("session", session);

    const client = new Shopify.Clients.Graphql(
      session.shop,
      session.accessToken
    );
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
  } catch (error) {
    console.log("error", error);
  }
});

app.listen(3000, () => {
  console.log("your app is now listening on port 3000");
});

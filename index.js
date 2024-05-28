#!/usr/bin/env node
import directoryTree from "directory-tree";
import extractModel from "mongoose-parser";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

import fs from "fs";
import { type } from "os";

const extractFiles = (tree) => {
  const files = [];
  for (let x = 0; x < tree.children.length; x++) {
    const child = tree.children[x];
    if (child.children) {
      files.push(...extractFiles(child));
    } else {
      files.push(child.path);
    }
  }
  return files;
};

const getRandomString = (minlength = 3, maxlength = 33) => {
  const randomChars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const length =
    Math.floor(Math.random() * (maxlength - minlength + 1)) + minlength;
  for (let i = 0; i < length; i++) {
    result += randomChars.charAt(
      Math.floor(Math.random() * randomChars.length)
    );
  }
  return result;
};

const getRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min) + min);
};

const getRandomBoolean = () => {
  return Math.random() >= 0.5;
};

const getDate = () => {
  return new Date();
};

const populateValue = (key, value) => {
  if (value === "String") {
    return getRandomString(3, 33);
  } else if (value === "Number") {
    return getRandomNumber(0, 100);
  } else if (value === "Boolean") {
    return getRandomBoolean();
  } else if (value === "Date") {
    return getDate();
  } else if (value === "Array") {
    // if it is array of nested documents it will have object Ids
    return [populateValue(key, value[0])];
  } else if (typeof value === "object") {
    if (value.type === "String") {
      console.log("the key is ", key, "the value is ", value);
      // if the property is email then return a random email
      if (key === "email") {
        return `${uuidv4()}@email.com`;
      }
      if (value.unique) {
        return `${uuidv4()}@email.com`;
      }
      if (value.enum) {
        return value.enum[getRandomNumber(0, value.enum.length)];
      }
      return getRandomString(value.minlength, value.maxlength);
    } else if (value.type === "Number") {
      return getRandomNumber(value.min || 0, value.max || 100);
    } else if (value.type === "Boolean") {
      return getRandomBoolean();
    } else if (value.type === "Date") {
      return getDate();
    } else if (value.type === "Array" || Array.isArray(value)) {
      // if it is array of nested documents it will have object Ids
      // since it is an array we will create N number of documents inside the array
      // if the array is an array of objects we will have to add _id to each object
      const arr = [];
      for (let i = 0; i < getRandomNumber(2, 12); i++) {
        const obj = populateValue(key, value[0]);
        if (typeof obj !== "object") {
          arr.push(obj);
        } else if (typeof obj === "object" && !obj._id) {
          obj._id = new mongoose.Types.ObjectId();
          arr.push(obj);
        }
      }

      return arr;
    } else {
      const obj = {};
      for (const objKey in value) {
        obj[objKey] = populateValue(objKey, value[objKey]);
      }
      return obj;
    }
  }
};

const run = async () => {
  await mongoose.connect("mongodb://localhost:27017/mongoflood", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("<------------------Connected to MongoDB------------------->");

  const tree = directoryTree("./testFiles", { extensions: /\.(js|ts)$/ });
  const files = [];
  files.push(...extractFiles(tree));
  const models = [];
  const content = fs.readFileSync(files[1], "utf8");

  const model = extractModel(content, true)[0];
  console.log("the model is ", model);
  const mongooseSchema = new mongoose.Schema(model.schema);

  const pop = populateValue(model.model, model.schema);
  console.log("populated value is ", pop);

  // const mongooseModel = mongoose.model("User", mongooseSchema);

  // time to insert a document inside the model

  // console.log(JSON.stringify(model, null, 2));
};

run();

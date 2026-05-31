/**
 * Vercel entrypoint — must import express and export the app.
 * @see https://vercel.com/docs/frameworks/backend/express
 */
const express = require('express');
const { createApp } = require('./lib/express-app');

const app = createApp();

module.exports = app;

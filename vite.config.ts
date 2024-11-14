import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import wasm from "vite-plugin-wasm";
import UnoCSS from "unocss/vite";

const SERVER_HOST = "127.0.0.1";
const SERVER_PORT = 13213;

export default defineConfig({
  plugins: [UnoCSS(), wasm(), solidPlugin()],
  server: {
    host: SERVER_HOST,
    port: SERVER_PORT,
  },
  build: {
    target: "esnext",
  },
});

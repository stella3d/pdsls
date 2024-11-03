/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import { Route, Router } from "@solidjs/router";
import {
  Layout,
  CollectionView,
  PdsView,
  RecordView,
  RepoView,
} from "./App.tsx";

render(
  () => (
    <Router root={Layout}>
      <Route path="/:pds" component={PdsView} />
      <Route path="/:pds/:repo" component={RepoView} />
      <Route path="/:pds/:repo/:collection" component={CollectionView} />
      <Route path="/:pds/:repo/:collection/:rkey" component={RecordView} />
    </Router>
  ),
  document.getElementById("root") as HTMLElement,
);

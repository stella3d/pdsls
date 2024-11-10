/* @refresh reload */
import { render } from "solid-js/web";
import "virtual:uno.css";
import "./tailwind-compat.css";
import "./index.css";
import { Route, Router } from "@solidjs/router";
import {
  Layout,
  CollectionView,
  PdsView,
  RecordView,
  RepoView,
  Home,
} from "./App.tsx";

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={Home} />
      <Route path="/:pds" component={PdsView} />
      <Route path="/:pds/:repo" component={RepoView} />
      <Route path="/:pds/:repo/:collection" component={CollectionView} />
      <Route path="/:pds/:repo/:collection/:rkey" component={RecordView} />
    </Router>
  ),
  document.getElementById("root") as HTMLElement,
);

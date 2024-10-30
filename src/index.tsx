/* @refresh reload */
import { Show, render } from "solid-js/web";
import "./index.css";
import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import { Route, Router, useParams } from "@solidjs/router";
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
      <Route path="/" component={Layout} />
      <Route
        path="/:pds"
        component={() => (
          <Show keyed when={useParams().pds}>
            <PdsView />
          </Show>
        )}
      />
      <Route
        path="/:pds/:did"
        component={() => (
          <Show keyed when={useParams().did}>
            <RepoView />
          </Show>
        )}
      />
      <Route
        path="/:pds/:did/:collection"
        component={() => (
          <Show keyed when={useParams().collection}>
            <CollectionView />
          </Show>
        )}
      />
      <Route
        path="/:pds/:did/:collection/:rkey"
        component={() => (
          <Show keyed when={useParams().rkey}>
            <RecordView />
          </Show>
        )}
      />
    </Router>
  ),
  document.getElementById("root") as HTMLElement,
);

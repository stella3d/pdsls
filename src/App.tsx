import { createSignal, onMount, For, Show, type Component } from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import {
  ComAtprotoRepoDescribeRepo,
  ComAtprotoRepoGetRecord,
  ComAtprotoRepoListRecords,
  ComAtprotoSyncListRepos,
} from "@atcute/client/lexicons";
import createProp from "./utils/createProp.js";
import {
  A,
  action,
  Params,
  redirect,
  RouteSectionProps,
  useAction,
  useParams,
} from "@solidjs/router";
import { getPDS, resolveHandle } from "./utils/api.js";
import { JSONValue } from "./lib/json.jsx";

type Theme = "light" | "dark";
export const theme = createProp<Theme>(
  localStorage?.theme || "light",
  function (newState: Theme) {
    if (newState === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    localStorage.theme = newState;
    this[1](newState);
    return newState;
  },
);

let rpc: XRPC;
const [notice, setNotice] = createSignal("");

const processInput = action(async (formData: FormData) => {
  const input = formData.get("input")?.toString();
  if (!input) return;
  if (
    !input.startsWith("https://bsky.app/") &&
    !input.startsWith("https://main.bsky.dev/") &&
    input.startsWith("https://")
  )
    throw redirect(`/${input.replace("https://", "").replace("/", "")}`);

  const uri = input
    .replace("at://", "")
    .replace("https://bsky.app/profile/", "")
    .replace("https://main.bsky.dev/profile/", "")
    .replace("/post/", "/app.bsky.feed.post/");
  let did = "";
  let pds = "";
  try {
    if (uri.startsWith("did:")) did = uri.split("/")[0];
    else did = await resolveHandle(uri.split("/")[0]);
    if (!did) throw Error;
    pds = await getPDS(did);
  } catch (err) {
    setNotice("Could not resolve At-URI/DID/Handle");
  }
  pds = pds.replace("https://", "");
  throw redirect(
    `/${pds}/${did}${uri.split("/").length > 1 ? "/" + uri.split("/").slice(1).join("/") : ""}`,
  );
});

const redirectAtURI = (params: Params) => {
  const process = useAction(processInput);
  const formData = new FormData();
  formData.append(
    "input",
    `${params.did}${params.collection ? "/" + params.collection : ""}${params.rkey ? "/" + params.rkey : ""}`,
  );
  process(formData);
};

const RecordView: Component = () => {
  const params = useParams();
  const [record, setRecord] = createSignal<ComAtprotoRepoGetRecord.Output>();

  onMount(() => {
    console.log("test");
    if (params.pds === "at") redirectAtURI(params);
    rpc = new XRPC({
      handler: new CredentialManager({ service: `https://${params.pds}` }),
    });
    fetchRecord(params.rkey);
  });

  const fetchRecord = async (rkey: string) => {
    try {
      setNotice("Loading...");
      const res = await rpc.get("com.atproto.repo.getRecord", {
        params: {
          repo: params.did,
          collection: params.collection,
          rkey: rkey,
        },
      });
      setRecord(res.data);
      setNotice("");
    } catch (err: any) {
      setNotice(err.message);
    }
  };

  return (
    <Show when={record()}>
      <div class="overflow-y-auto">
        <JSONValue data={record() as any} repo={params.did} />
      </div>
    </Show>
  );
};

const CollectionView: Component = () => {
  const params = useParams();
  const [cursorRecord, setCursorRecord] = createSignal<string>();
  const [records, setRecords] =
    createSignal<ComAtprotoRepoListRecords.Record[]>();

  onMount(() => {
    if (params.pds === "at") redirectAtURI(params);
    rpc = new XRPC({
      handler: new CredentialManager({ service: `https://${params.pds}` }),
    });
    fetchListRecords(params.collection);
  });

  const fetchListRecords = async (collection: string) => {
    setNotice("Loading...");
    const res = await rpc.get("com.atproto.repo.listRecords", {
      params: {
        repo: params.did,
        collection: collection,
        limit: 100,
        cursor: cursorRecord(),
      },
    });
    setCursorRecord(
      res.data.records.length < 100 ? undefined : res.data.cursor,
    );
    setRecords(records()?.concat(res.data.records) ?? res.data.records),
      setNotice("");
  };

  return (
    <div class="flex flex-col">
      <For each={records()}>
        {(record) => (
          <A
            href={`${record.uri.split("/").pop()}`}
            class="text-lightblue-500 hover:underline"
          >
            {record.uri.split("/").pop()!}
          </A>
        )}
      </For>
      <Show when={cursorRecord()}>
        <button
          type="button"
          onclick={() => fetchListRecords(params.collection)}
          class="dark:bg-dark-900 dark:hover:bg-dark-800 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 font-sans text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:text-gray-200 dark:hover:text-white"
        >
          Load More
        </button>
      </Show>
    </div>
  );
};

const RepoView: Component = () => {
  const params = useParams();
  const [repo, setRepo] = createSignal<ComAtprotoRepoDescribeRepo.Output>();

  onMount(async () => {
    setNotice("Loading...");
    if (params.pds === "at") redirectAtURI(params);
    rpc = new XRPC({
      handler: new CredentialManager({ service: `https://${params.pds}` }),
    });
    const res = await rpc.get("com.atproto.repo.describeRepo", {
      params: { repo: params.did },
    });
    setNotice("");
    setRepo(res.data);
  });

  return (
    <>
      <div class="flex w-fit flex-col self-center">
        <For each={repo()?.collections}>
          {(collection) => (
            <A
              href={`${collection}`}
              class="text-lightblue-500 hover:underline"
            >
              {collection}
            </A>
          )}
        </For>
      </div>
      <div class="mt-4">
        <pre class="overflow-y-auto text-sm">
          {JSON.stringify(repo()?.didDoc, null, 2)}
        </pre>
      </div>
    </>
  );
};

const PdsView: Component = () => {
  const params = useParams();
  const [cursorRepo, setCursorRepo] = createSignal<string>();
  const [repos, setRepos] = createSignal<ComAtprotoSyncListRepos.Repo[]>();

  onMount(() => {
    setNotice("");
    rpc = new XRPC({
      handler: new CredentialManager({ service: `https://${params.pds}` }),
    });
    fetchRepos();
  });

  const fetchRepos = async () => {
    try {
      setNotice("Loading...");
      const res = await rpc.get("com.atproto.sync.listRepos", {
        params: { limit: 1000, cursor: cursorRepo() },
      });
      setCursorRepo(res.data.repos.length < 1000 ? undefined : res.data.cursor);
      setRepos(repos()?.concat(res.data.repos) ?? res.data.repos);
      setNotice("");
    } catch (err: any) {
      setNotice(err.message);
    }
  };

  return (
    <>
      <For each={repos()}>
        {(repo) => (
          <A href={`${repo.did}`} class="text-lightblue-500 hover:underline">
            {repo.did}
          </A>
        )}
      </For>
      <Show when={cursorRepo()}>
        <button
          type="button"
          onclick={() => fetchRepos()}
          class="dark:bg-dark-900 dark:hover:bg-dark-800 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 font-sans text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:text-gray-200 dark:hover:text-white"
        >
          Load More
        </button>
      </Show>
    </>
  );
};

const Layout: Component<RouteSectionProps<unknown>> = (props) => {
  const params = useParams();
  const [pdsList, setPdsList] = createSignal<any>();

  onMount(async () => {
    setNotice("");
    if (params.pds) {
      if (params.pds === "at") redirectAtURI(params);
      rpc = new XRPC({
        handler: new CredentialManager({ service: `https://${params.pds}` }),
      });
    }
    const res = await fetch(
      "https://raw.githubusercontent.com/mary-ext/atproto-scraping/refs/heads/trunk/state.json",
    );
    const json = await res.json();
    setPdsList(Object.keys(json.pdses));
  });

  return (
    <div class="m-5 flex flex-col items-center dark:text-white">
      <div class="flex w-[20rem]">
        <div class="basis-1/3">
          <span
            class="cursor-pointer"
            onclick={() =>
              theme.set(theme.get() === "light" ? "dark" : "light")
            }
          >
            {theme.get()}
          </span>
        </div>
        <div class="mb-2 basis-1/3 text-center font-mono text-xl font-bold">
          <a href="https://pdsls.dev/">PDSls</a>
        </div>
      </div>
      <div class="mb-2 text-sm">
        <a class="text-lightblue-500" href="https://github.com/notjuliet/pdsls">
          source code
        </a>{" "}
        - made by{" "}
        <a
          class="text-lightblue-500"
          href="https://bsky.app/profile/did:plc:b3pn34agqqchkaf75v7h43dk"
        >
          juliet
        </a>
      </div>
      <div class="mb-5 flex max-w-full flex-col items-center text-pretty lg:max-w-screen-lg">
        <form
          class="flex flex-col items-center gap-y-1"
          method="post"
          action={processInput}
        >
          <datalist id="pdsInput">
            <For each={pdsList()}>{(pds) => <option value={pds}></option>}</For>
          </datalist>
          <div class="w-full">
            <label for="input" class="ml-0.5 text-left text-sm">
              Enter PDS URL / At-URI / DID / Handle
            </label>
          </div>
          <div class="flex gap-x-2">
            <input
              type="text"
              list="pdsInput"
              id="input"
              name="input"
              spellcheck={false}
              class="dark:bg-dark-100 rounded-lg border border-gray-400 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <button
              type="submit"
              class="dark:bg-dark-900 dark:hover:bg-dark-800 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:text-gray-200 dark:hover:text-white"
            >
              Go
            </button>
          </div>
        </form>
        <div class="m-2 min-h-6">{notice()}</div>
        <div class="mb-3 font-mono">
          <Show when={params.pds}>
            <A
              end
              href={params.pds}
              inactiveClass="text-lightblue-500 hover:underline"
            >
              {params.pds}
            </A>
          </Show>
          <Show when={params.did}>
            <span>{" / "}</span>
            <A
              end
              href={`${params.pds}/${params.did}`}
              inactiveClass="text-lightblue-500 hover:underline"
            >
              {params.did}
            </A>
          </Show>
          <Show when={params.collection}>
            <span>{" / "}</span>
            <A
              end
              href={`${params.pds}/${params.did}/${params.collection}`}
              inactiveClass="text-lightblue-500 hover:underline"
            >
              {params.collection}
            </A>
          </Show>
          <Show when={params.rkey}>
            <span>{" / " + params.rkey}</span>
          </Show>
        </div>
        <div class="flex max-w-full flex-col space-y-1 font-mono">
          <Show keyed when={params.pds}>
            {props.children}
          </Show>
        </div>
      </div>
    </div>
  );
};

export { Layout, PdsView, RepoView, CollectionView, RecordView };

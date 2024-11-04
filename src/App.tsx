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
  useLocation,
  useParams,
} from "@solidjs/router";
import { getPDS, resolveHandle } from "./utils/api.js";
import { JSONValue } from "./lib/json.jsx";
import { AiFillGithub, Bluesky, TbMoonStar, TbSun } from "./lib/svg.jsx";

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
const [pds, setPDS] = createSignal<string>();

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
  try {
    if (uri.startsWith("did:")) did = uri.split("/")[0];
    else did = await resolveHandle(uri.split("/")[0]);
    if (!did) throw Error;
    setPDS(await getPDS(did));
  } catch (err) {
    setNotice("Could not resolve At-URI/DID/Handle");
  }
  throw redirect(
    `/at/${did}${uri.split("/").length > 1 ? "/" + uri.split("/").slice(1).join("/") : ""}`,
  );
});

const resolvePDS = async (params: Params) => {
  try {
    let did;
    if (params.repo.startsWith("did:")) did = params.repo;
    else did = await resolveHandle(params.repo);
    if (!did) throw Error;
    const pds = await getPDS(did);
    setPDS(pds.replace("https://", ""));
    return pds;
  } catch (err) {
    setNotice("Could not resolve PDS");
  }
};

const RecordView: Component = () => {
  const params = useParams();
  const [record, setRecord] = createSignal<ComAtprotoRepoGetRecord.Output>();

  onMount(async () => {
    setNotice("Loading...");
    setPDS(params.pds);
    let pds = `https://${params.pds}`;
    if (params.pds === "at") pds = await resolvePDS(params);
    rpc = new XRPC({ handler: new CredentialManager({ service: pds }) });
    fetchRecord(params.rkey);
  });

  const fetchRecord = async (rkey: string) => {
    try {
      const res = await rpc.get("com.atproto.repo.getRecord", {
        params: {
          repo: params.repo,
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
      <div class="overflow-y-auto pl-4">
        <JSONValue data={record() as any} repo={record()!.uri.split("/")[2]} />
      </div>
    </Show>
  );
};

const CollectionView: Component = () => {
  const params = useParams();
  const [cursorRecord, setCursorRecord] = createSignal<string>();
  const [records, setRecords] =
    createSignal<ComAtprotoRepoListRecords.Record[]>();

  onMount(async () => {
    setNotice("Loading...");
    setPDS(params.pds);
    let pds = `https://${params.pds}`;
    if (params.pds === "at") pds = await resolvePDS(params);
    rpc = new XRPC({ handler: new CredentialManager({ service: pds }) });
    fetchListRecords(params.collection);
  });

  const fetchListRecords = async (collection: string) => {
    const res = await rpc.get("com.atproto.repo.listRecords", {
      params: {
        repo: params.repo,
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
    setPDS(params.pds);
    let pds = `https://${params.pds}`;
    if (params.pds === "at") pds = await resolvePDS(params);
    rpc = new XRPC({ handler: new CredentialManager({ service: pds }) });
    try {
      const res = await rpc.get("com.atproto.repo.describeRepo", {
        params: { repo: params.repo },
      });
      setNotice("");
      setRepo(res.data);
    } catch (err: any) {
      setNotice(err.message);
    }
  });

  return (
    <>
      <div class="mb-4 flex w-fit flex-col self-center">
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
      <Show when={repo()}>
        <div class="overflow-y-auto pl-4 text-sm">
          <JSONValue data={repo()?.didDoc as any} repo={repo()!.did} />
        </div>
      </Show>
    </>
  );
};

const PdsView: Component = () => {
  const params = useParams();
  const [cursorRepo, setCursorRepo] = createSignal<string>();
  const [repos, setRepos] = createSignal<ComAtprotoSyncListRepos.Repo[]>();

  onMount(() => {
    setNotice("Loading...");
    setPDS(params.pds);
    rpc = new XRPC({
      handler: new CredentialManager({ service: `https://${params.pds}` }),
    });
    fetchRepos();
  });

  const fetchRepos = async () => {
    try {
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
          <A
            href={`/at/${repo.did}`}
            classList={{
              "hover:underline relative": true,
              "text-lightblue-500": repo.active,
              "text-gray-300 dark:text-gray-600": !repo.active,
            }}
          >
            <span class="absolute -left-5 font-sans">
              {!repo.active ? "🪦" : ""}
            </span>
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
    const pdses: Record<string, { errorAt?: number; version?: string }> =
      await fetch(
        "https://raw.githubusercontent.com/mary-ext/atproto-scraping/refs/heads/trunk/state.json",
      ).then((res) => res.json().then((json) => json.pdses));
    setPdsList(Object.keys(pdses).filter((key) => !pdses[key].errorAt));
  });

  return (
    <div class="m-5 flex flex-col items-center dark:text-white">
      <div class="mb-2 flex w-[20rem] items-center">
        <div class="basis-1/3">
          <span
            class="cursor-pointer"
            onclick={() =>
              theme.set(theme.get() === "light" ? "dark" : "light")
            }
          >
            {theme.get() === "light" ?
              <TbSun class="size-6" />
            : <TbMoonStar class="size-6" />}
          </span>
        </div>
        <div class="basis-1/3 text-center font-mono text-xl font-bold">
          <a href="https://pdsls.dev/">PDSls</a>
        </div>
        <div class="justify-right flex basis-1/3 gap-x-2">
          <a
            href="https://bsky.app/profile/did:plc:b3pn34agqqchkaf75v7h43dk"
            target="_blank"
          >
            <Bluesky class="size-6" />
          </a>
          <a href="https://github.com/notjuliet/pdsls" target="_blank">
            <AiFillGithub class="size-6" />
          </a>
        </div>
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
            <label for="input" class="text-sm">
              PDS URL (https:// required) or AT URI (at:// optional)
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
        <div class="mb-3 mt-4 font-mono">
          <Show when={pds()}>
            <A
              end
              href={pds()!}
              inactiveClass="text-lightblue-500 hover:underline"
            >
              {pds()}
            </A>
          </Show>
          <Show when={params.repo}>
            <span>{" / "}</span>
            <A
              end
              href={`at/${params.repo}`}
              inactiveClass="text-lightblue-500 hover:underline"
            >
              {params.repo}
            </A>
          </Show>
          <Show when={params.collection}>
            <span>{" / "}</span>
            <A
              end
              href={`at/${params.repo}/${params.collection}`}
              inactiveClass="text-lightblue-500 hover:underline"
            >
              {params.collection}
            </A>
          </Show>
          <Show when={params.rkey}>
            <span>{" / " + params.rkey}</span>
          </Show>
        </div>
        <div>{notice()}</div>
        <div class="flex max-w-full flex-col space-y-1 font-mono">
          <Show keyed when={useLocation().pathname}>
            {props.children}
          </Show>
        </div>
      </div>
    </div>
  );
};

export { Layout, PdsView, RepoView, CollectionView, RecordView };

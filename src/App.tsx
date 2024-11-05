import { createSignal, onMount, For, Show, type Component } from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import {
  ComAtprotoRepoDescribeRepo,
  ComAtprotoRepoGetRecord,
  ComAtprotoRepoListRecords,
  ComAtprotoSyncListRepos,
} from "@atcute/client/lexicons";
import {
  A,
  action,
  query,
  redirect,
  RouteSectionProps,
  useLocation,
  useParams,
} from "@solidjs/router";
import { JSONValue } from "./lib/json.jsx";
import { AiFillGithub, Bluesky, TbMoonStar, TbSun } from "./lib/svg.jsx";

let rpc = new XRPC({
  handler: new CredentialManager({ service: "https://public.api.bsky.app" }),
});
const [notice, setNotice] = createSignal("");
const [pds, setPDS] = createSignal<string>();

const getPDS = query(async (did: string) => {
  const res = await fetch(
    did.startsWith("did:web") ?
      `https://${did.split(":")[2]}/.well-known/did.json`
    : "https://plc.directory/" + did,
  );

  return res.json().then((doc) => {
    for (const service of doc.service) {
      if (service.id === "#atproto_pds") return service.serviceEndpoint;
    }
  });
}, "getPDS");

const processInput = action(async (formData: FormData) => {
  const input = formData.get("input")?.toString();
  (document.getElementById("uriForm") as HTMLFormElement).reset();
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
    did = uri.split("/")[0];
    if (!uri.startsWith("did:")) {
      const res = await rpc.get("com.atproto.identity.resolveHandle", {
        params: { handle: uri.split("/")[0] },
      });
      did = res.data.did;
    }
    if (!did) throw Error;
    setPDS(await getPDS(did));
  } catch (err) {
    setNotice("Could not resolve AT URI");
  }
  throw redirect(
    `/at/${did}${uri.split("/").length > 1 ? "/" + uri.split("/").slice(1).join("/") : ""}`,
  );
});

const resolvePDS = async (repo: string) => {
  try {
    let did = repo;
    if (!repo.startsWith("did:")) {
      const res = await rpc.get("com.atproto.identity.resolveHandle", {
        params: { handle: repo },
      });
      did = res.data.did;
    }
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
    if (params.pds === "at") pds = await resolvePDS(params.repo);
    rpc = new XRPC({ handler: new CredentialManager({ service: pds }) });
    try {
      const res = await getRecord(params.repo, params.collection, params.rkey);
      setRecord(res.data);
      setNotice("");
    } catch (err: any) {
      setNotice(err.message);
    }
  });

  const getRecord = query(
    (repo: string, collection: string, rkey: string) =>
      rpc.get("com.atproto.repo.getRecord", {
        params: { repo: repo, collection: collection, rkey: rkey },
      }),
    "getRecord",
  );

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
    if (params.pds === "at") pds = await resolvePDS(params.repo);
    rpc = new XRPC({ handler: new CredentialManager({ service: pds }) });
    await fetchRecords();
    setNotice("");
  });

  const fetchRecords = async () => {
    const res = await listRecords(params.collection, cursorRecord());
    setCursorRecord(
      res.data.records.length < 100 ? undefined : res.data.cursor,
    );
    setRecords(records()?.concat(res.data.records) ?? res.data.records);
    setNotice("");
  };

  const listRecords = query(
    (collection: string, cursor: string | undefined) =>
      rpc.get("com.atproto.repo.listRecords", {
        params: {
          repo: params.repo,
          collection: collection,
          limit: 100,
          cursor: cursor,
        },
      }),
    "listRecords",
  );

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
          onclick={() => fetchRecords()}
          class="dark:bg-dark-700 dark:hover:bg-dark-800 mt-1 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 font-sans text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
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
    if (params.pds === "at") pds = await resolvePDS(params.repo);
    rpc = new XRPC({ handler: new CredentialManager({ service: pds }) });
    try {
      const res = await describeRepo(params.repo);
      setNotice("");
      setRepo(res.data);
    } catch (err: any) {
      setNotice(err.message);
    }
  });

  const describeRepo = query(
    (repo: string) =>
      rpc.get("com.atproto.repo.describeRepo", { params: { repo: repo } }),
    "describeRepo",
  );

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

  onMount(async () => {
    setNotice("Loading...");
    setPDS(params.pds);
    rpc = new XRPC({
      handler: new CredentialManager({ service: `https://${params.pds}` }),
    });
    await fetchRepos();
  });

  const fetchRepos = async () => {
    try {
      const res = await listRepos(cursorRepo());
      setCursorRepo(res.data.repos.length < 1000 ? undefined : res.data.cursor);
      setRepos(repos()?.concat(res.data.repos) ?? res.data.repos);
      setNotice("");
    } catch (err: any) {
      setNotice(err.message);
    }
  };

  const listRepos = query(
    (cursor: string | undefined) =>
      rpc.get("com.atproto.sync.listRepos", {
        params: { limit: 1000, cursor: cursor },
      }),
    "listRepos",
  );

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
          class="dark:bg-dark-700 dark:hover:bg-dark-800 mt-1 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 font-sans text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          Load More
        </button>
      </Show>
    </>
  );
};

const Home: Component = () => {
  return (
    <div class="flex flex-col break-words font-sans text-slate-800 dark:text-slate-200">
      <div>
        <span class="font-semibold text-orange-400">PDS URL</span> (https://
        required):
        <div>
          <A href="/pds.bsky.mom" class="text-lightblue-500 hover:underline">
            https://pds.bsky.mom
          </A>
        </div>
      </div>
      <div>
        <span class="font-semibold text-orange-400">AT URI</span> (at://
        optional, DID or handle alone also works):
        <div>
          <A
            href="/at/did:plc:oisofpd7lj26yvgiivf3lxsi/app.bsky.feed.post/3l2zpbbhuvw2h"
            class="text-lightblue-500 hover:underline"
          >
            at://did:plc:oisofpd7lj26yvgiivf3lxsi/app.bsky.feed.post/3l2zpbbhuvw2h
          </A>
        </div>
      </div>
      <div>
        <span class="font-semibold text-orange-400">Bluesky Link</span> (posts
        and profiles):
        <div>
          <A
            href="/at/did:plc:ia76kvnndjutgedggx2ibrem/app.bsky.feed.post/3kenlltlvus2u"
            class="text-lightblue-500 hover:underline"
          >
            https://bsky.app/profile/mary.my.id/post/3kenlltlvus2u
          </A>
        </div>
      </div>
    </div>
  );
};

const Layout: Component<RouteSectionProps<unknown>> = (props) => {
  const params = useParams();
  const [pdsList, setPdsList] = createSignal<any>();
  const [theme, setTheme] = createSignal(
    (
      localStorage.theme === "dark" ||
        (!("theme" in localStorage) &&
          globalThis.matchMedia("(prefers-color-scheme: dark)").matches)
    ) ?
      "dark"
    : "light",
  );

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
            onclick={() => {
              setTheme(theme() === "light" ? "dark" : "light");
              if (theme() === "dark")
                document.documentElement.classList.add("dark");
              else document.documentElement.classList.remove("dark");
              localStorage.theme = theme();
            }}
          >
            {theme() === "dark" ?
              <TbMoonStar class="size-6" />
            : <TbSun class="size-6" />}
          </span>
        </div>
        <div class="basis-1/3 text-center font-mono text-xl font-bold">
          <A href="/" class="hover:underline">
            PDSls
          </A>
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
          id="uriForm"
          method="post"
          action={processInput}
        >
          <datalist id="pdsInput">
            <For each={pdsList()}>{(pds) => <option value={pds}></option>}</For>
          </datalist>
          <div class="w-full">
            <label for="input" class="ml-0.5 text-sm">
              PDS URL or AT URI
            </label>
          </div>
          <div class="flex gap-x-2">
            <input
              type="text"
              list="pdsInput"
              id="input"
              name="input"
              autofocus
              spellcheck={false}
              class="dark:bg-dark-100 rounded-lg border border-gray-400 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <button
              type="submit"
              class="dark:bg-dark-700 dark:hover:bg-dark-800 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Go
            </button>
          </div>
        </form>
        <div class="mb-3 mt-4 flex flex-wrap font-mono">
          <Show when={pds() && params.pds}>
            <A
              end
              href={pds()!}
              inactiveClass="text-lightblue-500 hover:underline"
            >
              {pds()}
            </A>
          </Show>
          <Show when={params.repo}>
            <span class="mx-1.5">/</span>
            <A
              end
              href={`at/${params.repo}`}
              inactiveClass="text-lightblue-500 hover:underline"
            >
              {params.repo}
            </A>
          </Show>
          <Show when={params.collection}>
            <span class="mx-1.5">/</span>
            <A
              end
              href={`at/${params.repo}/${params.collection}`}
              inactiveClass="text-lightblue-500 hover:underline"
            >
              {params.collection}
            </A>
          </Show>
          <Show when={params.rkey}>
            <span class="mx-1.5">/</span>
            {params.rkey}
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

export { Layout, Home, PdsView, RepoView, CollectionView, RecordView };

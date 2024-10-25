import { createSignal, onMount, For, Show, type Component } from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import {
  ComAtprotoRepoDescribeRepo,
  ComAtprotoRepoListRecords,
  ComAtprotoSyncListRepos,
} from "@atcute/client/lexicons";

const [rpc, setRPC] = createSignal<XRPC | undefined>(undefined);
let manager: CredentialManager;
const [repoList, setRepoList] = createSignal<ComAtprotoSyncListRepos.Repo[]>(
  [],
);
const [cursor, setCursor] = createSignal<string | undefined>();
const [did, setDID] = createSignal<string | undefined>();
const [collection, setCollection] = createSignal<string | undefined>();

const ListRepos: Component = () => {
  const [pdsUrl, setPdsUrl] = createSignal("");
  const [notice, setNotice] = createSignal("");
  const [pdsList, setPdsList] = createSignal<any>();

  onMount(async () => {
    //const res = await fetch(
    //  "https://raw.githubusercontent.com/mary-ext/atproto-scraping/refs/heads/trunk/state.json",
    //);
    const res = await fetch("../state.json");
    setPdsList(await res.json());
  });

  const fetchListReposPage = async () => {
    const res = await rpc()!.get("com.atproto.sync.listRepos", {
      params: { limit: 500, cursor: cursor() },
    });
    setCursor(res.data.repos.length < 500 ? undefined : res.data.cursor);
    setRepoList(repoList().concat(res.data.repos));
  };

  const fetchPds = async (pdsUrl: string) => {
    setNotice("");
    setRepoList([]);
    try {
      if (!pdsUrl.startsWith("https://")) pdsUrl = `https://${pdsUrl}`;
      manager = new CredentialManager({ service: pdsUrl });
      setRPC(new XRPC({ handler: manager }));
      fetchListReposPage();
    } catch (err: any) {
      setNotice(err.message);
    }
  };

  return (
    <div class="flex flex-col items-center">
      <form
        class="mb-5 flex items-center gap-x-2"
        onsubmit={(e) => e.preventDefault()}
      >
        <Show when={pdsList()}>
          <datalist id="pdsInput">
            <For each={Object.keys(pdsList().pdses)}>
              {(pds) => <option value={pds}></option>}
            </For>
          </datalist>
        </Show>
        <label for="pdsInput">PDS URL</label>
        <input
          type="text"
          id="pdsInput"
          list="pdsInput"
          spellcheck={false}
          class="border border-black px-2 py-1"
          onInput={(e) => setPdsUrl(e.currentTarget.value)}
        />
        <button
          onclick={() => fetchPds(pdsUrl())}
          class="rounded bg-gray-600 px-2 py-1 text-sm font-bold text-white hover:bg-gray-800"
        >
          Go
        </button>
      </form>
      <Show when={notice()}>
        <div class="m-3">{notice()}</div>
      </Show>
      <Show when={repoList().length}>
        <div class="flex flex-col space-y-1">
          <For each={repoList()}>
            {(repo) => (
              <div
                class="cursor-pointer font-mono text-blue-600 hover:underline"
                onclick={() => setDID(repo.did)}
              >
                {repo.did}
              </div>
            )}
          </For>
          <Show when={cursor()}>
            <button
              type="button"
              onclick={() => fetchListReposPage()}
              class="mb-2 rounded bg-gray-600 px-2 py-1 font-bold text-white hover:bg-gray-800"
            >
              Load More
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
};

const ListCollections: Component = () => {
  const [collections, setCollections] = createSignal<string[]>([]);
  const [didDoc, setDidDoc] =
    createSignal<ComAtprotoRepoDescribeRepo.Output["didDoc"]>();

  onMount(async () => {
    setRepoList([]);
    const res = await rpc()!.get("com.atproto.repo.describeRepo", {
      params: { repo: did()! },
    });
    setCollections(res.data.collections);
    setDidDoc(res.data.didDoc);
  });

  return (
    <div class="flex flex-col space-y-1">
      <For each={collections()}>
        {(collection) => (
          <div
            class="cursor-pointer font-mono text-blue-600 hover:underline"
            onclick={() => setCollection(collection)}
          >
            {collection}
          </div>
        )}
      </For>
      <div class="mt-4 max-w-sm">
        <pre class="overflow-y-auto text-sm">
          {JSON.stringify(didDoc(), null, 2)}
        </pre>
      </div>
    </div>
  );
};

const ListRecords: Component = () => {
  const [recordsList, setRecordsList] = createSignal<
    ComAtprotoRepoListRecords.Record[]
  >([]);

  onMount(() => {
    fetchListRecordsPage();
  });

  const fetchListRecordsPage = async () => {
    const res = await rpc()!.get("com.atproto.repo.listRecords", {
      params: {
        repo: did()!,
        collection: collection()!,
        limit: 100,
        cursor: cursor(),
      },
    });
    setCursor(res.data.records.length < 100 ? undefined : res.data.cursor);
    setRecordsList(recordsList().concat(res.data.records));
  };

  return (
    <div class="flex flex-col space-y-1">
      <For each={recordsList()}>
        {(record) => (
          <div
            class="cursor-pointer font-mono text-blue-600 hover:underline"
            onclick={() => {}}
          >
            {record.uri.split("/").pop()!}
          </div>
        )}
      </For>
      <Show when={cursor()}>
        <button
          type="button"
          onclick={() => fetchListRecordsPage()}
          class="mb-2 rounded bg-gray-600 px-2 py-1 font-bold text-white hover:bg-gray-800"
        >
          Load More
        </button>
      </Show>
    </div>
  );
};

const App: Component = () => {
  return (
    <div class="m-5 flex flex-col items-center">
      <h1 class="mb-5 text-xl font-bold">PDSls</h1>
      <ListRepos />
    </div>
  );
};

export default App;

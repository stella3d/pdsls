import { A } from "@solidjs/router";
import VideoPlayer from "./video-player";

interface AtBlob {
  $type: string;
  ref: { $link: string };
  mimeType: string;
}

const JSONString = ({ data }: { data: string }) => {
  return (
    <pre class="text-green-600 dark:text-green-400">
      {data.startsWith("at://") && data.split(" ").length === 1 ?
        <A href={data.replace("at://", "/at/")}>{data}</A>
      : data.startsWith("did:") ?
        <A href={`/at/${data}`}>{data}</A>
      : URL.canParse(data) ?
        <a href={data} target="_blank" rel="noopener noreferer">
          {data}
        </a>
      : data}
    </pre>
  );
};

const JSONNumber = ({ data }: { data: number }) => {
  return <pre class="text-red-600 dark:text-red-500">{data}</pre>;
};

const JSONBoolean = ({ data }: { data: boolean }) => {
  return <pre class="text-blue-500">{data ? "true" : "false"}</pre>;
};

const JSONNull = () => {
  return <pre>null</pre>;
};

const JSONObject = ({
  data,
  repo,
}: {
  data: { [x: string]: JSONType };
  repo: string;
}) => {
  const rawObj = (
    <>
      {Object.entries(data)
        .toSorted()
        .map(([key, value], index) => (
          <div classList={{ "flex gap-2": true, "mt-4": index === 0 }}>
            <span class="text-yellow-700 dark:text-yellow-500">{key}:</span>
            <span>
              <JSONValue data={value} repo={repo} />
            </span>
          </div>
        ))}
    </>
  );

  const blob: AtBlob = data as any;

  if (blob.$type === "blob" && blob.mimeType.startsWith("image/")) {
    return (
      <>
        <a
          href={`https://cdn.bsky.app/img/feed_thumbnail/plain/${repo}/${blob.ref.$link}@jpeg`}
          target="_blank"
        >
          <img
            class="max-h-sm max-w-sm"
            src={`https://cdn.bsky.app/img/feed_thumbnail/plain/${repo}/${blob.ref.$link}@jpeg`}
          />
        </a>
        {rawObj}
      </>
    );
  }

  if (blob.$type === "blob" && blob.mimeType === "video/mp4") {
    return (
      <>
        <VideoPlayer did={repo} cid={blob.ref.$link} />
        {rawObj}
      </>
    );
  }

  return rawObj;
};

const JSONArray = ({ data, repo }: { data: JSONType[]; repo: string }) => {
  return (
    <div>
      {data.map((value) => (
        <span>
          <JSONValue data={value} repo={repo} />
        </span>
      ))}
    </div>
  );
};

export const JSONValue = ({ data, repo }: { data: JSONType; repo: string }) => {
  if (typeof data === "string") return <JSONString data={data} />;
  if (typeof data === "number") return <JSONNumber data={data} />;
  if (typeof data === "boolean") return <JSONBoolean data={data} />;
  if (data === null) return <JSONNull />;
  if (Array.isArray(data)) return <JSONArray data={data} repo={repo} />;
  return <JSONObject data={data} repo={repo} />;
};

export type JSONType =
  | string
  | number
  | boolean
  | null
  | { [x: string]: JSONType }
  | JSONType[];

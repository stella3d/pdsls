import { query } from "@solidjs/router";

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

const resolveHandle = query(async (handle: string) => {
  const res = await fetch(
    `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=` +
      handle,
  );

  return res.json().then((json) => json.did);
}, "resolveHandle");

export { getPDS, resolveHandle };

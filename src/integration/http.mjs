import { createServer } from "node:http";
/** Loopback/private machine-to-machine surface. Never mounted on public server. */
export function makeIntegrationServer({
  service,
  clock = Date.now,
  requestLimit = 30,
} = {}) {
  if (
    !service ||
    typeof service.principal !== "function" ||
    typeof clock !== "function" ||
    !Number.isSafeInteger(requestLimit) ||
    requestLimit < 1 ||
    requestLimit > 120
  )
    throw Error("Invalid integration host");
  let started = clock(),
    requests = 0;
  const server = createServer(async (req, res) => {
    const reply = (status, body) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
        "X-Robots-Tag": "noindex",
      });
      res.end(JSON.stringify(body));
    };
    try {
      const now = clock();
      if (!Number.isSafeInteger(now) || now < 0)
        return reply(503, { error: "Service unavailable" });
      if (now - started >= 60000) {
        started = now;
        requests = 0;
      }
      if (++requests > requestLimit) {
        res.setHeader("Retry-After", "60");
        return reply(429, { error: "Request quota exceeded" });
      }
      if (req.headers.origin !== undefined)
        return reply(403, { error: "Browser access denied" });
      if (
        typeof req.headers.authorization !== "string" ||
        !/^Bearer [^\s]{32,1024}$/.test(req.headers.authorization)
      )
        return reply(401, { error: "Authorization required" });
      const token = req.headers.authorization.slice(7),
        url = new URL(req.url, "http://localhost");
      if (req.method === "GET") {
        if (url.pathname === "/integration/status" && !url.search)
          return reply(200, await service.status(token));
        if (
          ["/integration/position", "/integration/payment"].includes(
            url.pathname,
          ) &&
          [...url.searchParams.keys()].length === 1 &&
          url.searchParams.has("id")
        )
          return reply(
            200,
            await (url.pathname.endsWith("position")
              ? service.position(token, url.searchParams.get("id"))
              : service.payment(token, url.searchParams.get("id"))),
          );
        return reply(404, { error: "Route unavailable" });
      }
      const route = {
        "/integration/objective": "createObjective",
        "/integration/payment/prepare": "preparePayment",
        "/integration/payment/unknown": "markUnknown",
        "/integration/payment/reconcile": "reconcilePayment",
        "/integration/payment/closing/prepare": "prepareClosing",
        "/integration/payment/closing/unknown": "markClosingUnknown",
        "/integration/payment/closing/reconcile": "reconcileClosing",
        "/integration/model/evaluate": "evaluateModel",
        "/integration/delivery/enroll": "enrollDelivery",
        "/integration/delivery/accept": "acceptDelivery",
      }[url.pathname];
      if (req.method !== "POST" || !route || url.search)
        return reply(404, { error: "Route unavailable" });
      if (
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
          req.headers["content-type"] || "",
        ) ||
        req.headers["content-encoding"]
      )
        return reply(415, { error: "Unencoded JSON required" });
      // Authenticate before accepting large bodies or contacting any provider.
      const action = {
        createObjective: "create-objective",
        preparePayment: "prepare-payment",
        markUnknown: "prepare-payment",
        reconcilePayment: "reconcile-payment",
        prepareClosing: "prepare-closing",
        markClosingUnknown: "prepare-closing",
        reconcileClosing: "reconcile-closing",
        evaluateModel: "evaluate-model",
        enrollDelivery: "enroll-delivery",
        acceptDelivery: "accept-delivery",
      }[route];
      service.principal(token, action);
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 262144) return reply(413, { error: "Request too large" });
        chunks.push(chunk);
      }
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        return reply(400, { error: "Invalid JSON" });
      }
      return reply(200, await service[route](token, body));
    } catch {
      return reply(403, {
        error:
          "Private request rejected; inspect saved operation before retrying",
      });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 5000;
  server.keepAliveTimeout = 1000;
  server.maxHeadersCount = 32;
  return server;
}

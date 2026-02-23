const CHROME_PORT = process.env.LHCI_CHROME_PORT ? Number(process.env.LHCI_CHROME_PORT) : undefined;

module.exports = {
    ci: {
        collect: {
            numberOfRuns: Number(process.env.LHCI_RUNS ?? "3"),
            staticDistDir: "../../mf-test/dist",
            url: ["http://localhost/"],
            settings: {
                chromeFlags: "--headless=new --disable-gpu --no-sandbox --no-first-run --no-default-browser-check",
                port: CHROME_PORT,
                portStrictMode: !!CHROME_PORT,
            },
        },
        upload: {
            target: "filesystem",
            outputDir: "benchmark-report/lighthouse",
        },
    },
};

# Documentation verification

Checked 2026-10-17 against the repository's installed Soubi 0.0.1 package metadata and README.

- [LLM index](https://soubi.vercel.app/llms.txt): serves a topic index with `/docs/<topic>` links.
- [Complete Markdown documentation](https://soubi.vercel.app/llms-full.txt): contains distinct topic sections, including plugin configuration and compatibility. Prefer focused topic pages to this large combined document.
- [Documentation](https://soubi.vercel.app/docs) and [source](https://github.com/Aniket-508/soubi): the installed package identifies this site and the former repository location, which redirects to the current source repository.

During verification, `/llms.mdx/docs/<topic>` returned the introduction for multiple different topics despite successful HTTP responses. Use the index's topic links rather than assuming that route serves the requested content. No documentation MCP endpoint was established by these sources.

The website tracks current documentation, not necessarily the installed dependency version. Confirm API availability and behavior against installed declarations and code before adding or removing a packaging workaround.

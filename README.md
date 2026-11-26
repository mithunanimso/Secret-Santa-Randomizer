# Secret Santa randomizer
Static site (no server, no database); runs entirely in the browser.

- `index.html` - organiser page: paste/upload Name,Code, optional fixed pairs, random list, CSVs, messages, PDF cards, and a shareable reveal link.
- `reveal.html` - participant page: enter the code you were sent to see who you are gifting (name + code) and download a PDF card.

The reveal link stores only names and codes in the URL fragment (never who gives to whom). Nothing is uploaded or saved.
Deploy on Vercel as a static project (framework: Other, no build command).

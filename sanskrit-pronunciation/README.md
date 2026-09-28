# React + Vite

## Word data

Words are loaded at runtime from `public/data/words.json`. Add another object
to its `words` array to add a pronunciation challenge. Each word needs
`sanskrit`, `meaning`, `audio`, and an `accepted` array; `recognitionLang` is
optional and defaults to `hi-IN`.

Put audio files under `public/audio/` and set `audio` to their root-relative
URL, for example `/audio/example.mp3`. The maximum score is calculated from
the number of words in the JSON file.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

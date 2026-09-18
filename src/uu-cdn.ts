import { setCodeMirrorModuleUrls } from './uu-dependencies.ts'

setCodeMirrorModuleUrls({
    state: 'https://esm.sh/@codemirror/state@6.7.4',
    view: 'https://esm.sh/@codemirror/view@6.43.11?deps=@codemirror/state@6.7.4',
    language: 'https://esm.sh/@codemirror/language@6.12.4?deps=@codemirror/state@6.7.4,@codemirror/view@6.43.11',
    json: 'https://esm.sh/@codemirror/lang-json@6.0.2?deps=@codemirror/language@6.12.4,@codemirror/state@6.7.4,@codemirror/view@6.43.11',
    search: 'https://esm.sh/@codemirror/search@6.7.2?deps=@codemirror/state@6.7.4,@codemirror/view@6.43.11'
})

export * from './uu.ts'
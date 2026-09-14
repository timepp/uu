import { loadChartJs, loadMarkdownIt } from './uu-dependencies.ts'
import { createElement } from './uu-dom.ts'
import { callAsyncFunctionWithProgress } from './uu-progress.ts'

export async function createMarkdownViewer(markdownText: string) {
	const { default: markdownIt } = await callAsyncFunctionWithProgress(loadMarkdownIt, 'Loading Markdown-It module...')
	const markdown = markdownIt({ html: false, linkify: true, typographer: true, breaks: true })
	const container = createElement(null, 'div')
	container.innerHTML = markdown.render(markdownText)
	container.querySelectorAll('a').forEach(link => {
		link.setAttribute('target', '_blank')
		link.setAttribute('rel', 'noopener noreferrer')
	})
	return container
}

export async function createChart(parent: HTMLElement, width: string, height: string, config: any) {
	const chartJsModule = await callAsyncFunctionWithProgress(loadChartJs, 'Loading Chart.js...')
	const wrapper = createElement(parent, 'div', [], '', { height, width, maxWidth: '100%' })
	const canvas = createElement(wrapper, 'canvas')
	const chart = new chartJsModule.default(canvas.getContext('2d'), config)
	return { canvas, chart }
}
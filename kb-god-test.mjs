#!/usr/bin/env node
// Simple E2E test for God knowledge base on Firebase Functions emulator
// Calls: uploadFile -> processDocument -> storeKnowledgeBase -> searchKnowledgeBase

const baseUrl = 'http://localhost:5001/home-listing-ai/us-central1';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callCallable(name, data) {
	const res = await fetch(`${baseUrl}/${name}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ data })
	});
	if (!res.ok) {
		const text = await res.text().catch(()=>'');
		throw new Error(`${name} HTTP ${res.status}: ${text}`);
	}
	const json = await res.json();
	if (!json || typeof json !== 'object' || !('result' in json || 'data' in json)) {
		// Emulator returns {result: ...}
		return json;
	}
	return json.result ?? json.data;
}

(async () => {
	const userId = 'test-user-god-1';
	const category = 'god';
	const content = 'Divine guidance about gratitude, meditation, and cosmic love. Seek inner peace.';
	const base64 = Buffer.from(content, 'utf8').toString('base64');

	console.log('1) uploadFile...');
	const upload = await callCallable('uploadFile', {
		file: base64,
		fileName: 'god-test.txt',
		fileType: 'text/plain',
		userId
	});
	if (!upload?.fileId) throw new Error('uploadFile failed: missing fileId');
	console.log('  fileId:', upload.fileId);

	console.log('2) processDocument...');
	const proc = await callCallable('processDocument', {
		fileId: upload.fileId,
		fileType: 'text/plain'
	});
	if (!proc?.extractedText) throw new Error('processDocument failed: no extractedText');
	console.log('  extractedText length:', proc.extractedText.length);

	console.log('3) storeKnowledgeBase...');
	const store = await callCallable('storeKnowledgeBase', {
		fileId: upload.fileId,
		category,
		tags: ['test','god'],
		userId
	});
	if (!store?.knowledgeId) throw new Error('storeKnowledgeBase failed: missing knowledgeId');
	console.log('  knowledgeId:', store.knowledgeId);

	console.log('4) searchKnowledgeBase...');
	const search = await callCallable('searchKnowledgeBase', {
		query: 'gratitude',
		userId,
		category,
		limit: 10
	});
	const results = search?.results || search?.data?.results || search;
	if (!Array.isArray(results) || results.length === 0) {
		throw new Error('searchKnowledgeBase returned no results');
	}
	console.log(`  results: ${results.length}`);
	console.log('OK: God knowledge base path works end-to-end.');
})().catch(async (err) => {
	console.error('Test failed:', err?.message || err);
	process.exitCode = 1;
});

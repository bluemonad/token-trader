import './assets/css/global.css';
import Options from "./components/Options.svelte";

const options = new Options({
	target: document.body,
	props: {}
});

export default options;

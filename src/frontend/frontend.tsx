
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle the message from the background worker
    console.log("Received message:", message);
    console.log("Received sender:", sender);

    if (message.command === "accept-input") {
        const request = prompt("What do you want to change?");
        sendResponse({ response: request });
    } else if (message.command == "go-to-edit") {
        // change the URL to the edit URL of the form index.php?title=ArticleName&action=edit
        const articleId = document.body.dataset.articleId;
        const url = `https://${document.location.host}/w/index.php?curid=${articleId}&action=edit`;
        document.location.href = url;
    } else if (message.command == "preview-edit") {
        // are we already on an edit page?
        if (document.location.href.includes("action=edit")) {
            // we are, so we can just submit the form
            const wiki_text = message.new_wikitext;
            const textArea: HTMLTextAreaElement | null = document.querySelector('textarea[name="wpTextbox1"]');
            if (textArea) {
                textArea.value = wiki_text;
                const diffButton: HTMLInputElement | null = document.querySelector('input[name="wpDiff"]')
                if (diffButton) {
                    diffButton.click();
                }
            }
            console.log("trigger preview", message);
        } else {
            // we're not, what happened?
            console.error("Tried to preview edit from a non-edit page", document.location.href);
        }
    }
    else {

    }
    return true;
});

// check if we are on an edit page and have the new wikitext
if (document.location.href.includes("action=edit") && window.sessionStorage.updateText) {
    const textArea: HTMLTextAreaElement | null = document.querySelector('textarea[name="wpTextbox1"]');
    if (textArea) {
        textArea.value = window.sessionStorage.updateText;
        const previewButton: HTMLInputElement | null = document.querySelector('input[name="wpDiff"]')
        if (previewButton) {
            previewButton.click();
        }
    }
}

console.log("quick-edit frontend loaded");

import Groq from 'groq-sdk';

const SystemMessage = `
You are helping a user to edit Wikipedia. You will be given a Wikipedia article in wikitext and a desired edit by the user. You will return the wikitext updated with the desired change.
Output only the modified wikitext, nothing else.

Example Input
===
Article: '''Jane Moore''' (born 17 May 1962)<ref>[https://www.heart.co.uk/showbiz/tv-movies/daytime-tv/loose-women-jane-moore-husband-age-children/ Loose Women Jane Moore: Husband, age and children revealed]. ''Heart''. Published 22 October 2018. Retrieved 12 December 2018.</ref> is an English journalist, author and television presenter, best known as a columnist for ''[[The Sun (United Kingdom)|The Sun]]'' newspaper and as a panellist and anchor on the [[ITV (TV network)|ITV]] lunchtime chat show ''[[Loose Women]]'' between 1999 and 2002, returning as a regular panellist from 2013 onwards.<ref>Alex Fletcher (9 October 2013). [http://www.digitalspy.co.uk/tv/news/a522292/nadia-sawalha-and-jane-moore-added-to-loose-women-lineup.html "Nadia Sawalha and Jane Moore added to 'Loose Women' lineup"]. Digital Spy.</ref> from 2018 Moore has been regularly relief-anchoring the show.
Selected Text: 17 May 1962
Change: Change her birthdate to May 18.



Example Output
===
'''Jane Moore''' (born 18 May 1962)<ref>[https://www.heart.co.uk/showbiz/tv-movies/daytime-tv/loose-women-jane-moore-husband-age-children/ Loose Women Jane Moore: Husband, age and children revealed]. ''Heart''. Published 22 October 2018. Retrieved 12 December 2018.</ref> is an English journalist, author and television presenter, best known as a columnist for ''[[The Sun (United Kingdom)|The Sun]]'' newspaper and as a panellist and anchor on the [[ITV (TV network)|ITV]] lunchtime chat show ''[[Loose Women]]'' between 1999 and 2002, returning as a regular panellist from 2013 onwards.<ref>Alex Fletcher (9 October 2013). [http://www.digitalspy.co.uk/tv/news/a522292/nadia-sawalha-and-jane-moore-added-to-loose-women-lineup.html "Nadia Sawalha and Jane Moore added to 'Loose Women' lineup"]. Digital Spy.</ref> from 2018 Moore has been regularly relief-anchoring the show.
`;



chrome.contextMenus.create(
    {
        id: 'select-target',
        title: 'Wikipedia Quick Edit',
        contexts: ['selection'],
        documentUrlPatterns: ['*://*.wikipedia.org/*']
    }
);


async function getWikiText(articleId: number | undefined): Promise<string> {
    if (!articleId) {
        throw new Error("No article ID found");
    }
    const url = `https://en.wikipedia.org/w/api.php?action=parse&pageid=${articleId}&prop=wikitext&formatversion=2&format=json`;
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            return data.parse.wikitext;
        });

}




async function getModifiedText(wikiText: string, selection: string, requestedChange: string): Promise<string> {
    const groq = new Groq({ apiKey: "" });

    const Prompt = `
    Article: ${wikiText}
    Selected Text: ${selection}
    Change: ${requestedChange}
    `

    const params = {
        messages: [
            { role: 'system', content: SystemMessage },
            { role: 'user', content: Prompt },
        ],
        model: 'llama3-70b-8192',
    };
    const chatCompletion: Groq.Chat.ChatCompletion = await groq.chat.completions.create(params);

    return chatCompletion.choices[0].message.content;
}

declare const RLCONF: { wgArticleId: number };
chrome.contextMenus.onClicked.addListener(async (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined) => {
    if (info.menuItemId === 'select-target' && tab && tab.id && info.selectionText) {
        console.log("select-target", info, tab);
        // get and expose the tab's article ID
        const articleId = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const articleId = RLCONF.wgArticleId;
                document.body.dataset.articleId = articleId.toString();
                return articleId;
            },
            world: 'MAIN'
        });

        const wikiText = await getWikiText(articleId[0].result);

        // ask the user what they want
        let selection = info.selectionText;
        let msg = await chrome.tabs.sendMessage(tab.id, { command: "accept-input", selection });
        let response = msg.response;
        // TODO: Some magic ML stuff
        console.log("tab", tab, tab.url);


        const new_wikitext = await getModifiedText(wikiText, selection, response);

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN',
            func: (text) => {
                window.sessionStorage.updateText = text;
            },
            args: [new_wikitext]
        });
        await chrome.tabs.sendMessage(tab.id, { command: "go-to-edit", new_wikitext });

        /*.then(() => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['backend/dialog.js'],
                world: 'MAIN'
            });
        });*/
        // send the new wikitext to the tab
        //const curTab = await chrome.tabs.getCurrent();
        //if (curTab && curTab.id) {
        //    console.log("sending preview-edit", new_wikitext, curTab.id);
        //    await chrome.tabs.sendMessage(curTab.id, { command: "preview-edit", new_wikitext });
        // }

    }
});


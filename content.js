// content.js will inject some extra content inside the Internet Archvie webpage.

// Creates a new "div" element and insert it before "Download Options" box.
var plugInBox = document.createElement("div");							// Creates new <div> element.
plugInBox.setAttribute("id", "iaPlugInBox");							// Give the new element an ID.
var element = document.getElementsByClassName("col-sm-4 thats-right");	// Find an existing element to append to.
element[0].insertBefore(plugInBox, element[0].firstChild);				// Append the new <div> element before already existing element.

// Box title
var boxTitle = document.createElement("div");
boxTitle.setAttribute("id", "boxTitle");
var textNode = document.createTextNode("ARCHIVE PLUG-IN MUSIC LIST");	// Add text to the element.
boxTitle.appendChild(textNode);										// Append the text to the new <div> element.
plugInBox.appendChild(boxTitle);



// Populate the newly created "div" element with all tracks in the album.
// All tracks are taken by hacking the "MP3 files" download list, and identifing a shared class called "stealth download-pill".
var archiveLinks = document.getElementsByClassName("stealth download-pill");
for (var elements = 0; elements < archiveLinks.length; ++elements)
{
	if (archiveLinks[elements].href.indexOf(".mp3") > -1)
	{
		var trackEntry = document.createElement("p");
		//var textLink = document.createTextNode(archiveLinks[elements].href);
		var musicName = archiveLinks[elements].innerHTML.substring(25, archiveLinks[elements].innerHTML.indexOf("<span"));		// Cutting out the starting empty spaces and <span> tags out of it.
		var textLink = document.createTextNode(musicName);
		trackEntry.appendChild(textLink);
		trackEntry.addEventListener("click", addMusicToExtension, false);
		trackEntry.setAttribute("id", "plugInLink");
		trackEntry.setAttribute("data-link", archiveLinks[elements].href);
		document.getElementById("iaPlugInBox").appendChild(trackEntry);
	}
	else
	{
		// The link is not an mp3, so do nothing.
	}
}

// Add a button to import the whole album.
var extraTd = document.createElement("td");
var allMusicButton = document.createElement("button");
textNode = document.createTextNode("Add ALL Music");
allMusicButton.appendChild(textNode);
allMusicButton.addEventListener("click", addAllMusic, false);
allMusicButton.setAttribute("id", "allMusicButton");
extraTd.appendChild(allMusicButton);
plugInBox.appendChild(extraTd);

// Send a message to the background page with the link for the music.
function addMusicToExtension ()
{
	chrome.runtime.sendMessage({addArchiveMusic: this.dataset.link}, function (response)
											{
												interfaceUpdate();
												updatePlayList();
											});
}

// Button that will add whole album to playList.
function addAllMusic()
{
	if (confirm("Add ALL tracks to playlist???"))
	{
		var albumLink = document.getElementsByClassName("stealth download-pill");
		for (var x = 0; x < albumLink.length; ++x)
		{
			// We want the "mp3" links only.
			if (albumLink[x].href.indexOf(".mp3") > -1)
			{
				// Add track to background playList.
				chrome.runtime.sendMessage({addArchiveMusic: albumLink[x].href});
			}
		}
	}
	else
	{
		// Do nothing.
	}
}
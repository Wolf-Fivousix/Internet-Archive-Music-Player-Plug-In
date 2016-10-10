// background.js runs all the time the plug-in is active.
// All the logic is handled here, all the work should be done HERE. Don't spread it around.

setInterval(keepPlaying, 1000);	// Keep checking every 1.000ms if the music has ended.

var playList = [ ];
var musicTag = document.getElementById("musicTag");
// Loads the stored playlist.
chrome.storage.sync.get(null, function (storedData)
{
	if (storedData["Play List"] != undefined)
	{
		playList = storedData["Play List"];
		musicTag.src = playList[0];
	}
} );


function keepPlaying ()
{
	if (musicTag.ended)
	{
		if(playList.indexOf(musicTag.src) === (playList.length - 1))		// Play list reached the end.
		{
			musicTag.src = playList[0];
		}
		else	// Playlist is note over yet, so we have at least 1 more song to go.
		{
			var currentIndex = playList.indexOf(musicTag.src) + 1;
			musicTag.src = playList[currentIndex];
			musicTag.play();
		}
	}
}

// runtime onMessage is the core of the plug-in. All messages received from popup to content script are handled by this listener.
// Each message is then directed to the corresponding function. If an answer is needed, 'sendRequest' is activated.
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) 
{
	if (request.musicId)
	{
		sendResponse(playThisMusic(request.musicId));
		return;
	}
	if (request.deleteId)
	{
		sendResponse(deleteThisMusic(request.deleteId));
		return;
	}
	if (request.addArchiveMusic)
	{
		sendResponse(addThisMusic(request.addArchiveMusic));
		return;
	}
	switch (request)
	{
		case "playMusic":
			sendResponse(playMusic());
			break;
		case "muteSound":
			sendResponse(muteMusic());
			break;
		case "previousSong":
			sendResponse(previousSong());
			break;
		case "nextSong":
			sendResponse(nextSong());
			break;
		case "clearPlayList":
			sendResponse(clearPlayList());
			break;
		case "exportPlayList":
			sendResponse(exportPlayList());
			break;
		default:
			console.log("Message not Handled: " + request);
			break;
	}	
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Functions that will be called by the messaging switch. Alphabetically ordered.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function addThisMusic(newMusic)
{
	playList.push(newMusic);											// Add new link to array.
	// Load and play the latest added music.
	musicTag.src = playList[(playList.length - 1)];
	musicTag.play();
	syncPlayList();
}
function deleteThisMusic(deleteId)
{
	var removedLink = playList.splice(deleteId, 1);		// Splices the element out of the array.
	console.log(removedLink);
	syncPlayList();
}
function exportPlayList()
{
	// Retrieve saved data.
	chrome.storage.sync.get(null, function (storedData)
	{
		// Guarantee there is data to be worked with.
		if (storedData["Play List"] != undefined)
		{
			// Now we need to format the data in the array manually before saving to the file.
			var formattedPlayListData = [];
			for(var i in storedData["Play List"])
			{
				formattedPlayListData[i] = (storedData["Play List"][i] + ",\r\n");	//Add's a comma and a new line after each link.
			}
			// Now just save to the file and download it.
			var textFileAsBlob = new Blob(formattedPlayListData);
			var fileNameToSaveAs = "Internet Archive Plug-In Play List.txt";		// Exported PlayList file name.
			var downloadLink = document.createElement("a");
			downloadLink.download = fileNameToSaveAs;
			if (window.URL != null)
			{
				// Chrome allows the link to be clicked
				// without actually adding it to the DOM.
				downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
			}
			else
			{
				// Do nothing.
			}
			downloadLink.click();
		}
	} );
}
function clearPlayList()
{
	// Clear the current playlist.
	for(var i = (playList.length - 1); i >= 0; --i)
	{
		// Have to clear background playlist.
		// If a button to clear playList is made, this code should use it.
		console.log(playList.pop());
	}
}
function muteMusic()
{
	if (musicTag.muted == true)		// If the track is already muted, then unmute.
	{
		musicTag.muted = false;
	}
	else
	{
		musicTag.muted = true;
		return("musicMuted");
	}
}
function nextSong()
{
	var playListIndex = playList.indexOf(musicTag.src) +1;	// +1 because we are returning musics in the play list.
	// If we are at the last music of the list, loop back to the first.
	if (playListIndex > playList.length - 1)
	{
		playListIndex = 0;
	}
	musicTag.src = playList[playListIndex];
	musicTag.play();
}
function playMusic()
{
	if (!musicTag.paused && !musicTag.ended)		// if (music is PLAYING and NOT OVER)
	{
		musicTag.pause();
		//window.clearInterval();		// Whenever music is paused, stop the timer.
	}
	else	// Music is paused.
	{
		musicTag.play();
		return("pauseIcon");
	}
}
function playThisMusic(newTrackId)
{
	musicTag.src = playList[newTrackId];
	//////// New Title Mode

	// Metadata HTTP request to retrieve track title.
	//https://archive.org/download/earman121/05-TerraNivium.mp3,
	var musicTitleHTTPAddress = playList[newTrackId];
	//https://archive.org/download/earman121
	musicTitleHTTPAddress = musicTitleHTTPAddress.substring(0, (musicTitleHTTPAddress.lastIndexOf("/")));
	//https://archive.org/download/earman121 + /earman121 + _files.xml
	musicTitleHTTPAddress = musicTitleHTTPAddress + (musicTitleHTTPAddress.substring(musicTitleHTTPAddress.lastIndexOf("/"))) + "_files.xml";
	//https://archive.org/download/earman121/earman121_files.xml
	
	var xmlPage = new XMLHttpRequest();
	//var textNode = document.createTextNode("");
	xmlPage.onreadystatechange = function ()
	{
		if (xmlPage.readyState == XMLHttpRequest.DONE && xmlPage.status == 200) // 200 is OK, check https://httpstatuses.com/ for info.
		{
			// Prints everything in the page.
			var metaData = xmlPage.responseText;
			// Find the "track.mp3" string position.
			var titlePosition = metaData.search(musicTag.src.substring(musicTag.src.lastIndexOf('/') + 1));
			//console.log(BG.musicTag.src.substring(BG.musicTag.src.lastIndexOf('/') + 1));
			//console.log(BG.musicTag.src.lastIndexOf('/') + 1);
			// Slice the request from that position.
			metaData = metaData.substring(titlePosition, titlePosition + 400);
			//console.log(metaData);
			// Finde "<title>" and "</title>" tags to extract what lies between.
			textNode = metaData.substring(metaData.lastIndexOf("<title>") + 7, metaData.lastIndexOf("</title>"));
			//console.log("Title: " + metaData.substring(metaData.lastIndexOf("<title>") + 7, metaData.lastIndexOf("</title>")));
		}
	};
	xmlPage.open("GET", musicTitleHTTPAddress, true);
	xmlPage.send();
	//console.log("Requested: " + musicTitleHTTPAddress);
	// Metadate HTTP request ends here.

//////// End New Title Mode
	musicTag.play();
}
function previousSong()
{
	var playListIndex = playList.indexOf(musicTag.src) -1;	// -1 because we are returning musics in the play list.
	// If we are at the 1st music in the list, go to the last.
	if (playListIndex < 0)
	{
		playListIndex = playList.length - 1;
	}
	musicTag.src = playList[playListIndex];
	musicTag.play();
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Auxiliary functions.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function syncPlayList()
{
	chrome.storage.sync.clear();										// Clear saved playlist.
	chrome.storage.sync.set( {"Play List" : playList} );				// Save the new updated playlist.
}
// This script is the middle man between the User Interface and the background, where all the action happens.
// No PERSISTENT logic should be executed here, as every time the popup disapears this scrip STOPS running and will run from start when popup.html is requested.

// Don't forget: Mac version export playList function is throwing the window outside the screen... See if you can fix the screen pop-up at 0,0 screen position.

var BG = chrome.extension.getBackgroundPage();					// Loads the background variables, do NOT change them here, only querry.
// Assign every element from the page a variable.
var musicTitle = 		document.getElementById("musicTitle");
var bacProgressBar = 	document.getElementById("backgroundProgressBar");
var progressBar = 		document.getElementById("progressBar");
var musicTimer =		document.getElementById("musicTimer");
var archiveButton =		document.getElementById("archiveButton");
var playButton = 		document.getElementById("playButton");			// playButton is also the "Pause" button.
var muteButton = 		document.getElementById("muteButton");
var previousButton = 	document.getElementById("previousButton");
var nextButton = 		document.getElementById("nextButton");
var importButton = 		document.getElementById("importButton");
var exportButton = 		document.getElementById("exportButton");
// Assign every button elment a "click" function. HTML onClick method does not work for Plug-In, this is one way of going around it.
archiveButton.addEventListener	("click", archivePageLink, false);
playButton.addEventListener		("click", playMusic, false);
muteButton.addEventListener		("click", muteSound , false);
previousButton.addEventListener	("click", previousSong , false);
nextButton.addEventListener		("click", nextSong , false);
importButton.addEventListener	("click", importPlayList, false);
exportButton.addEventListener	("click", exportPlayList , false);
bacProgressBar.addEventListener	("click", updateMusicTimer, false);

setInterval(interfaceUpdate, 1000);
updatePlayList();		// This update is expensive, so call it MANUALLY when needed. If placed inside "interfaceUpdate()" it will slow down the loading.

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 		Auxiliary Functions that handle the User Interface Display, basically what this script really does other than send messages to the background.
//		Alphabetically ordered.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// archiveButton will open a new tab with the archive web page.
function archivePageLink()
{
	chrome.tabs.create( {url: "https://archive.org/details/audio" });
}

// Load the current state of the player and display the corresponding UI. Except for Play List handling.
function interfaceUpdate()
{
	updateMusicData();
	updateProgressBar();
	updateButtons();
	console.log("Interface Updated");
}

// Read the contents of the selected file, split the links into an array and then message the background one by one.
// Important: The playList should have been automaticaly cleared out already, or this won't work.
// Because we are doing names retrieval from the server, if the IMPORTED playList is big enough it will take a couple seconds for the plug-in process all requests and start playing ANY song due to lack of resources.
function importFile()
{
	// Let's import from file.
	var fileToLoad = document.getElementById("fileToLoad").files[0];
	var fileReader = new FileReader();
	// Give the object a onLoad behavior.
	fileReader.onload = function(fileEvent)
	{
		// Tell background to clear existing playlist.
		chrome.runtime.sendMessage("clearPlayList", function (response)
		{
			// Wait for it to be done, confirm work and then import from file.
			if (BG.playList.length > 0)
			{
				console.log("Something went wrong. Your playList is not empty!");
			}
			else	// Everything good, proceed.
			{
				var textFromFileLoaded = fileEvent.target.result;
				textFromFileLoaded = textFromFileLoaded.slice(0, -3);	// Removes that one \r\n and last comma.
				// Now requesting to add tracks one by one.
				var splittedArray = textFromFileLoaded.split(",");
				for (var i in splittedArray)
				{
					// For each music link let's remove those "\r\n" that are breaking the title comparions.
					// We are using indexOf("h") because the first item in the array has only 2 charcters. So this way is better than adding a single "if" statement for that case.
					splittedArray[i] = splittedArray[i].substr(splittedArray[i].indexOf("h"));	// Cut the starting characters until the end.
					
					// Here's the problem: The messages are sent to the background and then this function keeps going on...
					// By the time we get to update the playList, BG has not yet process all those requests.
					// When it DOES process them, we are answering those process with updates to the playlist, but by the time THOSE messages come back,
					//ALL musics have already been added. Which means, we are repetitively doing the same thing over and over.
					// For now, this extra work doesn't seem too much of a problem, but definitely should be improved in the future.
					// (Maybe a callback could be used, like how the asynchronous requests for the music titles was made.)
					chrome.runtime.sendMessage({addArchiveMusic: splittedArray[i]}, function (response)
												{
													updatePlayList();
												});
				}
				console.log("I am not waiting for anyone and will just keep going on!");
			}
		});
	};
	// Now load that object so it can run the assigned function.
	fileReader.readAsText(fileToLoad);
}

// Will make an HTTP request to the archive.org server and look for a specific music track title through the XML file.
function musicTitleRetriever(musicAddress, IDaddress, callBackFunction)
{
	// Metadata HTTP request to retrieve track title.
	var musicTitleHTTPAddress = musicAddress;
	//https://archive.org/download/earman121/05-TerraNivium.mp3,
	musicTitleHTTPAddress = musicTitleHTTPAddress.substring(0, (musicTitleHTTPAddress.lastIndexOf("/")));
	//https://archive.org/download/earman121
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
			// Because we are inside a loop, when this guy executes, BG.playList[i] will ALWAYS be the last value of the array...
			var titlePosition = metaData.search(musicAddress.substring(musicAddress.lastIndexOf('/') + 1));
			// Slice the request from that position.
			metaData = metaData.substring(titlePosition, titlePosition + 400);
			// Find "<title>" and "</title>" tags to extract what lies between.
			callBackFunction(metaData.substring(metaData.lastIndexOf("<title>") + 7, metaData.lastIndexOf("</title>")), IDaddress );
		}
	};
	xmlPage.open("GET", musicTitleHTTPAddress, true);
	xmlPage.send();
	// Metadate HTTP request ends here.
}

// Updates the interface buttons to their current status. (playing, paused, muted, etc..)
function updateButtons()
{
	// Play Button
	if (!BG.musicTag.paused && !BG.musicTag.ended)	// if (music is PLAYING and NOT OVER)
	{
		playButton.style.backgroundImage = "url(Images/pauseButton.png)";
	}
	else
	{
		playButton.style.backgroundImage = "url(Images/playButton.png)";
	}
	// Mute Button
	if (BG.musicTag.muted == true)		// If the track is already muted, show mute button.
	{
		muteButton.style.backgroundImage = "url(Images/muteButton.png)";
	}
	else	// track is not muted.
	{
		muteButton.style.backgroundImage = "url(Images/speakerButton.png)";
	}
}

// Updates all music data, like progress bar, duration, music length, etc.
function updateMusicData()
{
	// Updates the music name.
	if (BG.musicTag.src == "")
	{
		musicTitle.innerText = "No music to load. :(";
	}
	else
	{
		// Need to update the music title from the interface to the new correct name retrieved from the server.
		for (var i in BG.playList)
		{
			if (BG.playList[i] === BG.musicTag.src)
			{
				musicTitle.innerText = document.getElementById(i).innerHTML;
			}
		}
	}
	// Couldn't figure out a way to use "onloadedmetadata" to avoid displaying "NaN:NaN". =(
	musicTimer.innerHTML = zeroPadding(BG.musicTag.currentTime) + " / " + zeroPadding(BG.musicTag.duration);
}

// Updates music current time to the selected one.
function updateMusicTimer(e)
{
	var barClickPosition = e.pageX - bacProgressBar.offsetLeft;	// Where the user clicked on the screen, corrected by the distance from the corner of the web browser.
	// Changing BG.musicTag variable that SHOULD be querry only, but I couldn't figure out a way of getting the necessary information to the background.
	BG.musicTag.currentTime = barClickPosition * BG.musicTag.duration / bacProgressBar.offsetWidth;	// Calculates what is the music new current time.
	updateProgressBar();
}

// Update the current playList with the current songs in our background array.
function updatePlayList()
{
	console.log("Playlist Size: " + BG.playList.length);

	// Before updating, clear every item inside the music list div.
	var myMusicList = document.getElementById("listDiv");
	while (myMusicList.firstChild)
	{
		myMusicList.removeChild(myMusicList.firstChild);
	}
	if (BG.playList.length > 0)		// There is at least 1 item in the array.
	{
		var listIndex = 0;
		for(var i in BG.playList)
		{
			var newTableEntry = document.createElement("td");				// Creates new <table> element.
			// Extract the music Title from it's link, and use it to create a default name for the music.
			var textNode = document.createTextNode(							// Add text to the element.
													(parseInt(i, 10) + 1)	// Making "i" a number, so we can add up.
													+ ": " + BG.playList[i].substring(BG.playList[i].lastIndexOf('/') + 1)	// Get only the music name from the link.
													);
			// Now let's check the database for the real title, this is asynchronous, that is why we needed a default name.
			musicTitleRetriever(BG.playList[i], i, function (titleName, ID)
														{
															document.getElementById(ID).innerHTML = (parseInt(ID, 10) + 1) + ": " + titleName;
														});
			
			
			
			newTableEntry.appendChild(textNode);								// Append the text to the new element.
			newTableEntry.addEventListener("click", playThisMusic, false);		// Add the function call to each new element.
			newTableEntry.setAttribute("id", listIndex);						// Give the new element an ID.
			newTableEntry.setAttribute("class", "musicListingName");			// Give a class for layout purposes.
			
			// Create Del button that will align with the corresponding song entry.
			var newDeleteButton = document.createElement("td");
			textNode = document.createTextNode("Del");
			newDeleteButton.appendChild(textNode);
			newDeleteButton.setAttribute("id", listIndex);						// Give the new element an ID.
			newDeleteButton.setAttribute("class", "musicListingDel");			// Give a class for layout purposes.
			newDeleteButton.addEventListener("click", deleteThisMusic, false);
			
			// Finish the element, attach both entries to a table row and attach it to the listDiv itself as a next child.
			++listIndex;													// Increase the ID counter global variable.
			var newTableRow = document.createElement("tr");
			newTableRow.appendChild(newTableEntry);
			newTableRow.appendChild(newDeleteButton);
			var element = document.getElementById("listDiv");				// Find an existing element to append to.
			element.appendChild(newTableRow);								// Append the new element to the already existing element.
		}
	}
	else		// playList is empty.
	{
		myMusicList.innerHTML = "Your playlist is Empty :(";
	}
	console.log("Play List created");
}

function updateProgressBar()
{
	progressBar.style.width = (parseInt(BG.musicTag.currentTime * bacProgressBar.offsetWidth / BG.musicTag.duration)) + "px";
}

function zeroPadding(nonPaddedTime)
{
	var minutesTracker = parseInt(nonPaddedTime/60);
	var secondsTracker;
	
	if (nonPaddedTime%60 < 10)		// seconds are less than 10.
	{
		secondsTracker = "0" + parseInt(nonPaddedTime%60);
	}
	else
	{
		secondsTracker = parseInt(nonPaddedTime%60);
	}
	
	return (minutesTracker + ":" + secondsTracker);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 		Every interface function call will send a message to be handled by the background page. Alphabetically ordered.
// the interfaceUpdate is called as a response for the message because, otherwise, it would execute BEFORE the message is processed by the background.js.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function deleteThisMusic()
{
	chrome.runtime.sendMessage({deleteId: this.id}, function (response)
											{
												interfaceUpdate();
												updatePlayList();
											});
}
function exportPlayList()
{
	chrome.runtime.sendMessage("exportPlayList", function (response)
											{
												interfaceUpdate();
												updatePlayList();
											});
}
function importPlayList()
{
	importFile();
	interfaceUpdate();
}
function muteSound()
{
	chrome.runtime.sendMessage("muteSound", function (response)
											{
												interfaceUpdate();
											});
}
function nextSong()
{
	chrome.runtime.sendMessage("nextSong", function (response)
											{
												interfaceUpdate();
											});
}
function playMusic()
{
	chrome.runtime.sendMessage("playMusic", function (response)
											{
												interfaceUpdate();
											});
}
function playThisMusic()
{
	chrome.runtime.sendMessage({musicId: this.id}, function (response)
											{
												interfaceUpdate();
											});
}
function previousSong()
{
	chrome.runtime.sendMessage("previousSong", function (response)
											{
												interfaceUpdate();
											});
}
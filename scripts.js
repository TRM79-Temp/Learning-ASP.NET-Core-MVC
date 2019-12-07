// localStorage.projects = JSON.stringify([{
//     name: 'party_Invites_2_0',
//     active: true,
//     apiUrl: 'https://api.github.com/repos/TRM79-Temp/ASP-PartyInvites-2.0/commits',
//     commits: localStorage.party_Invites_2_0
//     text: ''
// }])

console.log('Github API Helper - v.0.28');

window.GithubApiHelper = function () {
    this.projects = JSON.parse(localStorage.getItem('projects'));

    this.editingMode = (localStorage.editingMode === 'true');

    this.getCommits = function (commitsApiUrl, commitsToLoad) {
        // commitsApiUrl: 'https://api.github.com/repos/TRM79-Temp/ASP-PartyInvites-2.0/commits'
        var that = this;

        async function getCommitsInt (commitsObjectText) {
            var result = [];
            var commitsObject = JSON.parse(commitsObjectText);

            try {
                if (commitsToLoad == 0 || commitsToLoad > commitsObject.length) {
                    commitsToLoad = commitsObject.length;
                }
                var commitsLoaded = 0;

                for (var i = 0; i < commitsObject.length && commitsLoaded < commitsToLoad; i++) {
                    console.log(commitsObject[i].commit.message);
                    var commitText = await that.getCommit(commitsObject[i].url);
                    var commit = JSON.parse(commitText);

                    var files = [];
                    for (var j = 0; j < commit.files.length; j++) {
                        files.push(commit.files[j].filename);
                    }

                    result.push({
                        url: commit.html_url,
                        message: commitsObject[i].commit.message,
                        files: files,
                        blob_url: commit.files[0].blob_url
                    });

                    commitsLoaded++;
                }
            }
            catch (exception) {
                result.push({
                    message: JSON.stringify(exception)
                });
            }

            return result;
        };

        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            const maxTries = 10;
            var tryCount = 1;
            xhr.onreadystatechange = async function() {
                if (this.readyState == 4 && this.status == 200) {
                    console.log('** Commits list loaded.');

                    var commits = await getCommitsInt(this.responseText);
                    console.log('** Commits loaded.');

                    resolve(commits);
                }
                else if (tryCount <= maxTries) {
                    console.log('** No data loaded (readyState: ' + this.readyState
                        + ', status: ' + this.status + '), try #' + tryCount + '.');
                    tryCount++;
                }
                else {
                    console.log('** Rejected (readyState: ' + this.readyState
                        + ', status: ' + this.status + '), tries: ' + tryCount + '.');
                    reject(this.status);
                }
            };
            xhr.open("GET", commitsApiUrl);
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.send();
        });
    };

    this.getCommit = function (url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('get', url);
            xhr.onload = function () {
                var status = xhr.status;
                if (status == 200) {
                    resolve(this.responseText);
                } else {
                    reject(status);
                }
            };
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.send();
        });
    };

    this.saveCommits = function (name, commitsApiUrl, commits, text) {
        // setCookie('gitCommits', txt.replace(/;/g, '$$$'), 1000);
        var found = false;
        for (var i = 0; i < this.projects.length; i++) {
            if (this.projects[i].name == name) {
                this.projects[i].apiUrl = commitsApiUrl;
                this.projects[i].commits = commits;
                this.projects[i].text = text;
                found = true;
            }
        }

        if (!found) {
            this.projects.push({
                name: name,
                apiUrl: commitsApiUrl,
                commits: commits,
                text: text
            });
        }

        this.saveChanges();
    };

    this.getActiveProject = function () {
        // return getCookie('gitCommits').replace(/\$\$/g, ';');
        for (var i = 0; i < this.projects.length; i++) {
            if (this.projects[i].active) {
                return this.projects[i];
            }
        }

        // No active projects found.
        if (this.projects.length > 0) {
            return this.projects[this.projects.length - 1];
        }
        else {
            return null;
        }
    };

    this.setActiveProject = function (projectName) {
        for (var i = 0; i < this.projects.length; i++) {
            if (this.projects[i].name == projectName) {
                this.projects[i].active = true;
            }
            else {
                this.projects[i].active = false;
            }
        }
    };

    this.containsProject = function (projectName) {
        for (var i = 0; i < this.projects.length; i++) {
            if (this.projects[i].name == projectName) {
                return true;
            }
        }

        return false;
    };

    this.saveChanges = function () {
        localStorage.setItem('projects', JSON.stringify(this.projects));
    }
}

/*
 *  Processing data.
 */

window.onload = function () {

    var githubApiHelper = new window.GithubApiHelper();

    // Helper functions.

    function download(data, filename, type) {
        var file = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                    url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    async function openFile(event) {
        var file = event.target.files[0];

        // https://stackoverflow.com/questions/51026420/filereader-readastext-async-issues
        return new Promise((resolve, reject) => {
          let content = '';
          const reader = new FileReader();

          // Wait till complete
          reader.onloadend = function(e) {
            content = e.target.result;
            resolve(content);
          };

          // Make sure to handle error states
          reader.onerror = function(e) {
            reject(e);
          };

          reader.readAsText(file);
        });
    }

    async function importNotes(event) {
        var notesText = await openFile(event);
        localStorage.setItem('projects', notesText);
    }

    function showProject (activeProject) {
        document.getElementById('commitsApiUrl').value = activeProject.apiUrl;
        document.getElementById('commits').value = activeProject.commits;
        document.getElementById('textEdit').value = activeProject.text;

        //

        if (!githubApiHelper.editingMode) {
            document.getElementById('text').innerHTML = activeProject.text;
        }

        //

        var commits = JSON.parse(activeProject.commits);
        var commitsSpan = document.getElementsByTagName('span');

        for (var i = 0; i < commitsSpan.length; i++) {
            if (commitsSpan[i].hasAttribute('data-listing')) {
                var listingAttr = commitsSpan[i].getAttribute('data-listing');
                if (typeof(listingAttr) == 'undefined' || listingAttr == null || listingAttr == '') {
                    continue;
                }

                var commitIndex = commits.findIndex(el => el.message == listingAttr);
                if (commitIndex >= 0) {
                    commitsSpan[i].innerHTML =
                        '<a href="' + commits[commitIndex].blob_url + '">' + listingAttr + '</a>';

                    // TO DO: Search all file names, not only el.files[0].
                    var previousVersionIndex = commits.findIndex(el => el.files.indexOf(commits[commitIndex].files[0]) > -1);
                    if (previousVersionIndex < commitIndex) {
                        commitsSpan[i].innerHTML +=
                            ' (<a href="' + commits[commitIndex].url + '">Δ</a>)'
                    }
                }
            }
        }
    }

    // Event handlers.

    document.getElementById('btnDownload').onclick = async function() {
        console.log('Download');

        var url = document.getElementById('commitsApiUrl').value;
        if (url == '') {
            alert('Enter a valid url to the \'Commits API URL\' field.');
            return;
        }

        var commitsToLoadText = document.getElementById('commitsToLoad').value;
        var commitsToLoad = Number.parseInt(commitsToLoadText);
        if (isNaN(commitsToLoad)) {
            alert('Enter a valid number to the \'Commits to load\' field.');
            return;
        }

        try {
            console.log('** Commits to load:');
            console.log(commitsToLoad);

            var resultObject = await githubApiHelper.getCommits(url, commitsToLoad);
            resultObject.reverse();
            console.log('** Result object:');
            console.log(resultObject);

            document.getElementById('commits').value =
                JSON.stringify(resultObject);
        }
        catch (error) {
            console.log('** An error woccured while downloading:');
            console.log(error);
        }
    };

    document.getElementById('btnSave').onclick = function() {
        console.log('Save');
        githubApiHelper.saveCommits(
            document.getElementById('projects').value,
            document.getElementById('commitsApiUrl').value,
            document.getElementById('commits').value,
            document.getElementById('textEdit').value
        );
    }

    document.getElementById('btnShow').onclick = function() {
        console.log('Show');
        document.getElementById('commits').value = githubApiHelper.getActiveProject().commits;
    }

    document.getElementById('projects').onchange = function() {
        var projectName = this.value;
        githubApiHelper.setActiveProject(projectName);
        githubApiHelper.saveChanges();
        var project = githubApiHelper.getActiveProject();
        showProject(project);
    }

    document.getElementById('editingMode').onchange = function() {
        localStorage.editingMode = this.checked;
        githubApiHelper.editingMode = this.checked;
    }

    document.getElementById('btnExport').onclick = function() {
        download(JSON.stringify(githubApiHelper.projects), 'projects.txt', 'text/plain');
    }

    document.getElementById('fileImport').onchange = function(event) {
        importNotes(event);
    }

    document.getElementById('btnAddNew').onclick = function() {
        var projectName = document.getElementById('newProject').value;
        if (projectName == '') {
            alert('Enter the project name.');
            return;
        }

        if (githubApiHelper.containsProject(projectName)) {
            alert('A project with the name \'' + projectName + '\' already exists.');
            return;
        }

        githubApiHelper.saveCommits(projectName, '', '', '');
        githubApiHelper.setActiveProject(projectName);
        githubApiHelper.saveChanges();
        alert('Project added. Please reload page.');
    }

    // Getting projects and displaying an active.

    var activeProject = githubApiHelper.getActiveProject();
    var activeProjectIndex = 0;

    var selectProject = '';
    for (var i = 0; i < githubApiHelper.projects.length; i++) {
        selectProject += '<option>' + githubApiHelper.projects[i].name + '</option>';
        if (githubApiHelper.projects[i].name == activeProject.name) {
            activeProjectIndex = i;
        }
    }

    var projectSelect = this.document.getElementById('projects');
    projectSelect.innerHTML = selectProject;
    projectSelect.selectedIndex = activeProjectIndex;

    //

    document.getElementById('editingMode').checked = githubApiHelper.editingMode;

    //

    showProject(activeProject);
}
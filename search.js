document.addEventListener("DOMContentLoaded", function() {
    let data;

    fetch('data.json')
        .then(response => response.json())
        .then(json => {
            data = json.books;
            populateBookList();
        })
        .catch(error => {
            console.error('Error loading JSON data:', error);
        });

    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('search');
    const resultsList = document.getElementById('results');
    const bookListButton = document.getElementById('bookListButton');
    const bookList = document.getElementById('bookList');
    const chaptersList = document.getElementById('chaptersList');
    const mainContent = document.getElementById('mainContent');

    let currentBook = null;

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    bookListButton.addEventListener('click', () => {
        bookList.classList.toggle('hidden');
    });

    function performSearch() {
        const query = searchInput.value.toLowerCase();
        const results = [];

        if (query.length > 2) {
            data.forEach(book => {
                const bookTitle = book.title.toLowerCase();
                const bookAuthor = book.author.toLowerCase();
                const bookYear = book.year.toLowerCase();

                if (bookTitle.includes(query) || bookAuthor.includes(query) || bookYear.includes(query)) {
                    results.push({
                        title: book.title,
                        author: book.author,
                        year: book.year,
                        chapterTitle: null,
                        paragraphs: [],
                        matchIndex: null
                    });
                }

                book.chapters.forEach(chapter => {
                    const chapterTitle = chapter.chapterTitle.toLowerCase();

                    if (chapterTitle.includes(query)) {
                        results.push({
                            title: book.title,
                            author: book.author,
                            year: book.year,
                            chapterTitle: chapter.chapterTitle,
                            paragraphs: chapter.paragraphs,
                            matchIndex: null
                        });
                    }

                    chapter.paragraphs.forEach((paragraph, index) => {
                        let paragraphText = '';
                        if (typeof paragraph === 'string') {
                            paragraphText = paragraph.toLowerCase();
                        } else if (paragraph.subheading) {
                            paragraphText = paragraph.subheading.toLowerCase();
                        } else if (paragraph.stanza) {
                            paragraphText = paragraph.stanza.join(' ').toLowerCase();
                        } else if (paragraph.caption) {
                            paragraphText = paragraph.caption.toLowerCase();
                        } else if (paragraph.table) {
                            paragraphText = paragraph.table.flat().join(' ').toLowerCase();
                        }

                        if (paragraphText.includes(query)) {
                            results.push({
                                title: book.title,
                                author: book.author,
                                year: book.year,
                                chapterTitle: chapter.chapterTitle,
                                paragraphs: chapter.paragraphs,
                                matchIndex: index
                            });
                        }
                    });
                });
            });
        }

        displayResults(results, query);
    }

    function displayResults(results, query) {
        resultsList.innerHTML = '';

        if (results.length === 0) {
            resultsList.innerHTML = '<li>No results found</li>';
            return;
        }

        resultsList.innerHTML = results.map((result, index) => `
            <li onclick="displayBookContent('${result.title}', ${result.matchIndex !== null ? `'${result.chapterTitle}'` : 'null'}, ${result.matchIndex !== null ? result.matchIndex : 'null'})" data-index="${index}" class="search-result">
                <h1>${highlightText(result.title, query)}</h1>
                <h2>${highlightText(result.author, query)}</h2>
                <h2>${highlightText(result.year, query)}</h2>
                ${result.chapterTitle ? `<h3>${highlightText(result.chapterTitle, query)}</h3>` : ''}
                <div class="initial">
                    ${result.matchIndex !== null ? renderParagraph(result.paragraphs[result.matchIndex], true, query) : ''}
                </div>
                <div class="scrollable">
                    ${result.paragraphs ? result.paragraphs.map(paragraph => renderParagraph(paragraph, false, query)).join('') : ''}
                </div>
            </li>
        `).join('');

        document.querySelectorAll('.initial').forEach((element, index) => {
            element.addEventListener('click', function() {
                this.style.display = 'none';
                const scrollable = this.nextElementSibling;
                scrollable.style.display = 'block';
                scrollable.scrollTop = scrollable.querySelector(`[style*="background-color: #ffff99;"]`).offsetTop - 50;
            });
        });
    }

    function renderParagraph(paragraph, isHighlighted, query) {
        const highlightedText = (text) => {
            const regEx = new RegExp(`(${query})`, 'gi');
            return text.replace(regEx, '<span style="background-color: #ffff99;">$1</span>');
        };

        if (typeof paragraph === 'string') {
            return `<p style="font-size: 14px;">${highlightedText(paragraph)}</p>`;
        } else if (paragraph.subheading) {
            return `<h3 style="text-align: center; font-weight: bold;">${highlightedText(paragraph.subheading)}</h3>`;
        } else if (paragraph.stanza) {
            return `<pre style="font-size: 14px;">${paragraph.stanza.map(line => highlightedText(line)).join('\n')}</pre>`;
        } else if (paragraph.image) {
            return `
                <div class="image-container">
                    <img src="${paragraph.image}" alt="${highlightedText(paragraph.caption)}">
                    <p>${highlightedText(paragraph.caption)}</p>
                </div>
            `;
        } else if (paragraph.table) {
            return renderTable(paragraph.table, query);
        } else {
            return '';
        }
    }

    function renderTable(tableData, query) {
        return `
            <div class="table-container">
                <table class="centered-table">
                    ${tableData.map(row => `
                        <tr>
                            ${row.map(cell => `<td>${highlightText(cell || '', query)}</td>`).join('')}
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
    }

    function highlightText(text, query) {
        const regEx = new RegExp(`(${query})`, 'gi');
        return text.replace(regEx, '<span style="background-color: #ffff99;">$1</span>');
    }

    function populateBookList() {
        bookList.innerHTML = data.map(book => `<li onclick="displayChapters('${book.title}')" class="book-list-item">${book.title}</li>`).join('');
    }

    window.displayChapters = function(bookTitle) {
        currentBook = data.find(b => b.title === bookTitle);
        chaptersList.innerHTML = `
            <h2>${currentBook.title}</h2>
            ${currentBook.chapters.map(chapter => `
                <li onclick="displayChapterContent('${bookTitle}', '${chapter.chapterTitle}')" class="chapter-list-item">
                    ${chapter.chapterTitle}
                    <ul>
                        ${chapter.paragraphs.map(paragraph => {
                            if (typeof paragraph === 'object' && paragraph.subheading) {
                                return `<li onclick="displaySubheadingContent('${bookTitle}', '${chapter.chapterTitle}', '${paragraph.subheading}')" class="subheading-list-item">${paragraph.subheading}</li>`;
                            } else {
                                return '';
                            }
                        }).join('')}
                    </ul>
                </li>
            `).join('')}
        `;
        chaptersList.classList.remove('hidden');
    }

    window.displayChapterContent = function(bookTitle, chapterTitle) {
        const book = data.find(b => b.title === bookTitle);
        const chapter = book.chapters.find(c => c.chapterTitle === chapterTitle);
        const chapterContent = chapter.paragraphs.map(paragraph => renderParagraph(paragraph, false, '')).join('');
        mainContent.innerHTML = `
            <h2>${book.title}</h2>
            <h3>${chapter.chapterTitle}</h3>
            ${chapterContent}
        `;
    }

    window.displaySubheadingContent = function(bookTitle, chapterTitle, subheading) {
        const book = data.find(b => b.title === bookTitle);
        const chapter = book.chapters.find(c => c.chapterTitle === chapterTitle);
        const subheadingIndex = chapter.paragraphs.findIndex(p => typeof p === 'object' && p.subheading === subheading);
        const subheadingContent = chapter.paragraphs.slice(subheadingIndex).map(paragraph => renderParagraph(paragraph, false, '')).join('');
        mainContent.innerHTML = `
            <h2>${book.title}</h2>
            <h3>${chapter.chapterTitle}</h3>
            ${subheadingContent}
        `;
    }

    window.displayBookContent = function(bookTitle, chapterTitle, matchIndex) {
        const book = data.find(b => b.title === bookTitle);
        const chapter = book.chapters.find(c => c.chapterTitle === chapterTitle);
        displayChapters(book.title);
        const content = chapter.paragraphs.map(paragraph => renderParagraph(paragraph, false, searchInput.value)).join('');
        mainContent.innerHTML = `
            <h2>${book.title}</h2>
            <h3>${chapter.chapterTitle}</h3>
            ${content}
        `;
        chaptersList.classList.remove('hidden');
    }
});

(() => {
  const RAW_PREFIX = 'https://raw.githubusercontent.com/';
  const DEFAULT_BRANCH = 'main';
  const DICTIONARY_SOURCE = 'https://raw.githubusercontent.com/metacritical/shorty/refs/heads/main/words.txt';
  const INDEX_CHAR_OFFSET = 0x0100;
  const CASE_VARIANTS = 3;
  const BOX_DIGITS = buildRangeDigits(0x2500, 128);
  const BOX_DIGIT_MAP = new Map(BOX_DIGITS.map((char, index) => [char, index]));
  const BOX_DIGIT_LENGTH = 3;
  const CLASSIC_STYLE = {
    parseValue(payload, startIndex) {
      const char = payload[startIndex];
      if (!char) {
        throw new Error('Invalid dictionary token.');
      }
      const encodedValue = char.codePointAt(0) - INDEX_CHAR_OFFSET;
      if (encodedValue < 0) {
        throw new Error('Invalid dictionary index.');
      }
      return { value: encodedValue, consumed: 1 };
    }
  };
  const BOX_STYLE = {
    parseValue(payload, startIndex) {
      let encodedValue = 0;
      const base = BOX_DIGITS.length;
      for (let offset = 0; offset < BOX_DIGIT_LENGTH; offset += 1) {
        const char = payload[startIndex + offset];
        if (!char) {
          throw new Error('Invalid dictionary token.');
        }
        const digit = BOX_DIGIT_MAP.get(char);
        if (digit === undefined) {
          throw new Error('Unknown digit in dictionary token.');
        }
        encodedValue = encodedValue * base + digit;
      }
      return { value: encodedValue, consumed: BOX_DIGIT_LENGTH };
    }
  };
  const DICTIONARY = { pages: {}, lookup: new Map() };

  const payload = detectCode();
  if (!payload) {
    return;
  }

  fetch(DICTIONARY_SOURCE)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to load dictionary');
      }
      return response.text();
    })
    .then((text) => {
      const pages = Object.create(null);
      text.split(/\r?\n/u).forEach((line) => {
        const word = line.trim().toLowerCase();
        if (!/^[a-z]+$/u.test(word)) {
          return;
        }
        const page = word[0];
        if (!pages[page]) {
          pages[page] = [];
        }
        if (!pages[page].includes(word)) {
          pages[page].push(word);
        }
      });
      DICTIONARY.pages = pages;
      redirectWithPayload(payload);
    })
    .catch((error) => {
      console.error('Shorty redirect failed:', error);
    });

  function detectCode() {
    if (window.location.search && window.location.search.length > 1) {
      const raw = decodeURIComponent(window.location.search.slice(1));
      if (raw.includes('=')) {
        const params = new URLSearchParams(window.location.search);
        if (params.has('code')) {
          return parseCode(decodeURIComponent(params.get('code') || ''), 'box');
        }
      }
      return parseCode(raw, 'box');
    }
    if (window.location.hash && window.location.hash.length > 1) {
      return parseCode(decodeURIComponent(window.location.hash.slice(1)), 'classic');
    }
    return null;
  }

  function parseCode(raw, fallbackStyle) {
    if (!raw) {
      return null;
    }
    if (raw.startsWith('c:')) {
      return { code: raw.slice(2), style: 'classic' };
    }
    if (raw.startsWith('b:')) {
      return { code: raw.slice(2), style: 'box' };
    }
    return { code: raw, style: fallbackStyle };
  }

  function redirectWithPayload(payload) {
    try {
      const result = decodeShortCode(payload.code, payload.style === 'box' ? BOX_STYLE : CLASSIC_STYLE);
      window.location.replace(result.rawUrl);
    } catch (error) {
      console.error('Shorty decode failed:', error);
    }
  }

  function decodeShortCode(code, style) {
    const decoded = decodeText(code, style);
    const parts = decoded.split('/');
    if (parts.length < 3) {
      throw new Error('Shortcode is missing components.');
    }
    const [owner, repoToken, ...rest] = parts;
    const filepath = rest.join('/');
    if (!owner || !repoToken || !filepath) {
      throw new Error('Shortcode is incomplete.');
    }
    const { repo, branch } = unpackRepoToken(repoToken);
    return {
      rawUrl: buildRawUrl(owner, repo, branch, filepath)
    };
  }

  function decodeText(payload, style) {
    let index = 0;
    let result = '';
    while (index < payload.length) {
      const current = payload[index];
      if (current === '^') {
        const next = payload[index + 1];
        if (next === '^') {
          result += '^';
          index += 2;
          continue;
        }
        const pageSymbol = next;
        const { value: encodedValue, consumed } = style.parseValue(payload, index + 2);
        const entryIndex = Math.floor(encodedValue / CASE_VARIANTS);
        const caseValue = encodedValue % CASE_VARIANTS;
        const list = DICTIONARY.pages[pageSymbol] || [];
        const baseWord = list[entryIndex];
        if (!baseWord) {
          throw new Error('Unknown dictionary entry.');
        }
        result += applyCasePattern(baseWord, caseValue);
        index += 2 + consumed;
      } else {
        result += current;
        index += 1;
      }
    }
    return result;
  }

  function applyCasePattern(baseWord, caseValue) {
    if (caseValue === 2) {
      return baseWord.toUpperCase();
    }
    if (caseValue === 1) {
      return baseWord.charAt(0).toUpperCase() + baseWord.slice(1);
    }
    return baseWord;
  }

  function unpackRepoToken(token) {
    const atIndex = token.indexOf('@');
    if (atIndex === -1) {
      return { repo: token, branch: DEFAULT_BRANCH };
    }
    const repo = token.slice(0, atIndex);
    const branchCandidate = token.slice(atIndex + 1);
    return { repo, branch: branchCandidate || DEFAULT_BRANCH };
  }

  function buildRawUrl(owner, repo, branch, filepath) {
    const branchSegment = 'refs/heads/' + branch + '/';
    return RAW_PREFIX + owner + '/' + repo + '/' + branchSegment + filepath;
  }

  function buildRangeDigits(start, count) {
    const result = [];
    for (let offset = 0; offset < count; offset += 1) {
      result.push(String.fromCharCode(start + offset));
    }
    return result;
  }
})();

// KidzPlayful — Live Demo (prototipe interaktif)
(function () {
  'use strict';

  var coins = 0, round = 0, correctCount = 0, curQ = '', pinBuf = '', tt;

  var ITEMS = [
    { q: 'kucing', ok: '🐱', no: ['🐶', '🐮', '🐰'] },
    { q: 'anjing', ok: '🐶', no: ['🐱', '🐸', '🐷'] },
    { q: 'bebek',  ok: '🦆', no: ['🐔', '🐢', '🐠'] },
    { q: 'gajah',  ok: '🐘', no: ['🦒', '🐭', '🐧'] },
    { q: 'sapi',   ok: '🐮', no: ['🐴', '🐑', '🐤'] }
  ];

  function $(id) { return document.getElementById(id); }

  function go(id) {
    var list = document.querySelectorAll('.screen');
    for (var i = 0; i < list.length; i++) list[i].classList.remove('on');
    var el = $(id); if (el) el.classList.add('on');
  }

  function setCoins() {
    ['coin1', 'coin2', 'coin3'].forEach(function (i) { var e = $(i); if (e) e.textContent = coins; });
  }

  function speak(t) {
    try {
      if (window.speechSynthesis) {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(t);
        u.lang = 'id-ID'; u.rate = 0.9; u.pitch = 1.15;
        speechSynthesis.speak(u);
      }
    } catch (e) { /* abaikan jika tak didukung */ }
  }

  function sayPrompt() { if (curQ) speak('Mana ' + curQ + '?'); }

  function mix(arr, seed) { var a = arr.slice(); for (var k = 0; k < seed % 4; k++) a.push(a.shift()); return a; }

  function startGame() { round = 0; correctCount = 0; go('s-play'); renderRound(); }

  function renderRound() {
    if (round >= ITEMS.length) return showReward();
    var it = ITEMS[round];
    curQ = it.q;
    $('q').textContent = ' ' + it.q + ' ';
    $('round').textContent = (round + 1) + '/' + ITEMS.length;
    $('prog').style.width = (round / ITEMS.length * 100) + '%';
    var choices = mix([it.ok, it.no[0], it.no[1], it.no[2]], round + 1);
    var grid = $('grid'); grid.innerHTML = '';
    choices.forEach(function (emo) {
      var b = document.createElement('button');
      b.className = 'opt'; b.textContent = emo;
      b.addEventListener('click', function () { choose(b, emo === it.ok); });
      grid.appendChild(b);
    });
    setTimeout(sayPrompt, 350);
  }

  function choose(btn, correct) {
    if (correct) {
      btn.classList.add('benar'); coins++; correctCount++; setCoins(); speak('Hebat!');
      var opts = document.querySelectorAll('.opt');
      for (var i = 0; i < opts.length; i++) opts[i].style.pointerEvents = 'none';
      $('prog').style.width = ((round + 1) / ITEMS.length * 100) + '%';
      setTimeout(function () { round++; renderRound(); }, 850);
    } else {
      btn.classList.add('salah'); speak('Coba lagi ya');
      setTimeout(function () { btn.classList.remove('salah'); }, 450);
    }
  }

  function showReward() {
    var s = correctCount >= 5 ? 3 : (correctCount >= 3 ? 2 : 1);
    $('stars').textContent = ['⭐', '⭐⭐', '⭐⭐⭐'][s - 1];
    $('rewsub').textContent = 'Kamu menjawab ' + correctCount + ' dari ' + ITEMS.length + ' · +' + correctCount + ' koin 🪙';
    go('s-reward'); confetti(); speak('Hore, kamu hebat!');
  }

  function confetti() {
    var c = $('confetti'); c.innerHTML = '';
    var emo = ['⭐', '🌸', '🎈', '💜', '🌟', '🍃'];
    for (var i = 0; i < 26; i++) {
      var s = document.createElement('span');
      s.textContent = emo[i % emo.length];
      s.style.left = (4 + (i * 3.6) % 92) + '%';
      s.style.animationDuration = (2.2 + (i % 5) * 0.4) + 's';
      s.style.animationDelay = ((i % 8) * 0.12) + 's';
      c.appendChild(s);
    }
    setTimeout(function () { c.innerHTML = ''; }, 4200);
  }

  // PIN
  function openPin() { pinBuf = ''; drawPin(); $('pin').classList.add('on'); }
  function closePin() { $('pin').classList.remove('on'); }
  function drawPin() { for (var i = 0; i < 4; i++) $('d' + i).className = i < pinBuf.length ? 'f' : ''; }
  function pinPress(n) {
    if (pinBuf.length < 4) { pinBuf += n; drawPin(); if (pinBuf.length === 4) setTimeout(checkPin, 150); }
  }
  function pinDel() { pinBuf = pinBuf.slice(0, -1); drawPin(); }
  function checkPin() {
    if (pinBuf === '1234') { closePin(); toast('✓ Mode orang tua terbuka (demo)'); }
    else { toast('PIN salah, coba lagi'); pinBuf = ''; drawPin(); }
  }

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 1900);
  }

  // Satu listener terdelegasi untuk semua aksi (data-*)
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-go],[data-act],[data-toast],[data-pin]');
    if (!el) return;
    if (el.hasAttribute('data-go')) return go(el.getAttribute('data-go'));
    if (el.hasAttribute('data-toast')) return toast(el.getAttribute('data-toast'));
    if (el.hasAttribute('data-pin')) return pinPress(el.getAttribute('data-pin'));
    switch (el.getAttribute('data-act')) {
      case 'start': return startGame();
      case 'say': return sayPrompt();
      case 'openpin': return openPin();
      case 'closepin': return closePin();
      case 'pindel': return pinDel();
    }
  });
})();

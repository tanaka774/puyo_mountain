import lang from "../../locales";
import { renderTurnstileWidget } from "../captchaHandle.js"

export function addCloseButton(dialogElement: HTMLDialogElement, text: string = lang.close) {
  const closeButton = document.createElement("button");
  closeButton.textContent = text;
  closeButton.addEventListener("click", (e) => {
    e.preventDefault();
    dialogElement.close();
  });
  dialogElement.appendChild(closeButton);
}

export function addTwitterShareButton(parent: HTMLElement, shareText: string) {
  const shareUrl = 'https://puyomountain.com';
  const hashtags = 'ぷよマウンテン';
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${hashtags}`;
  const twitterButton = document.createElement('a');
  twitterButton.setAttribute('href', twitterShareUrl);
  twitterButton.setAttribute('target', '_blank');
  twitterButton.textContent = lang.shareOnX;

  Object.assign(twitterButton.style, {
    display: 'inline-block',
    padding: '5px 10px',
    marginLeft: '10px',
    marginRight: '10px',
    backgroundColor: '#1DA1F2',
    color: 'white',
    borderRadius: '5px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '16px',
    textAlign: 'center',
    transition: 'background-color 0.3s'
  });

  twitterButton.addEventListener('mouseover', () => {
    twitterButton.style.backgroundColor = '#0c85d0';
  });

  twitterButton.addEventListener('mouseout', () => {
    twitterButton.style.backgroundColor = '#1DA1F2';
  });

  parent.appendChild(twitterButton);
}

export function addRecaptcha(parent: HTMLElement) {
  const turnstileContainer = document.createElement('div');
  turnstileContainer.setAttribute("id", "turnstileContainer");

  const existingScript = document.querySelector(
    'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
  );

  if (!existingScript) {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  parent.appendChild(turnstileContainer);

  // Attempt to render immediately if Turnstile API is already loaded
  renderTurnstileWidget(turnstileContainer);
}

export function formatTime(timeInSeconds: number): string {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = timeInSeconds % 60;

  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

export function formatCreatedAt(createdAt: string): string {
  const date = new Date(createdAt + 'Z');
  return date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tokyo' });
}

export function scaleAndSetFixedPosition(element: HTMLElement, scale: number) {
  const rect = element.getBoundingClientRect();
  const originalTop = rect.top;
  const originalLeft = rect.left;

  element.style.transform = `scale(${scale})`;

  const newRect = element.getBoundingClientRect();
  const newTop = newRect.top;
  const newLeft = newRect.left;

  const translateY = originalTop - newTop;
  const translateX = originalLeft - newLeft;
  // this does nothing... maybe origin:top, left; in css is just enough
  // element.style.transform = `scale(${scale}) (${translateX}px, ${translateY}px)`;
}

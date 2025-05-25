'use client'

import styles from './style.module.css';

export default function createContainer(document: Document) {
  const portalId: string = `notificationContainter`;
  let element: HTMLElement | null = document.getElementById(portalId);

  if (element)
    return element;

  element = document.createElement(`div`);
  element.setAttribute('id', portalId);
  element.className = styles.container;
  document.body.appendChild(element);
  return element;
}

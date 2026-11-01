import { eventFromRowActionsMenu } from './row-actions-menu.util';

describe('eventFromRowActionsMenu', () => {
  it('DetectsClickInsideMenuWrap', () => {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-row-actions-menu', '');
    const button = document.createElement('button');
    wrap.appendChild(button);
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: button });
    Object.defineProperty(event, 'composedPath', { value: () => [button, wrap, document.body] });
    expect(eventFromRowActionsMenu(event)).toBeTrue();
  });

  it('DetectsClickOnPortaledMenu', () => {
    const menu = document.createElement('div');
    menu.setAttribute('data-row-actions-menu', '');
    const item = document.createElement('button');
    menu.appendChild(item);
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: item });
    Object.defineProperty(event, 'composedPath', { value: () => [item, menu, document.body] });
    expect(eventFromRowActionsMenu(event)).toBeTrue();
  });

  it('IgnoresClickOutsideMenu', () => {
    const outside = document.createElement('div');
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: outside });
    Object.defineProperty(event, 'composedPath', { value: () => [outside, document.body] });
    expect(eventFromRowActionsMenu(event)).toBeFalse();
  });
});

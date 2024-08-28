import {defineExtension, useCommand, useStatusBarItem} from 'reactive-vscode';
import {window, StatusBarAlignment, env, Uri} from 'vscode';
import {logger} from './utils';
import {config} from './config';
const {activate, deactivate} = defineExtension(() => {
    logger.info('Extension Activated!');
    logger.show();

    const item = useStatusBarItem({
        alignment: StatusBarAlignment.Left,
        command: 'jump',
        text: config.label,
        tooltip: `Jump to ${config.url}`
    });

  item.show()
    useCommand('jump', () => {
        const url = config.url;
        env.openExternal(Uri.parse(url));
    });
});

export { activate, deactivate }

import React from 'react';

import LinkifyIt from 'linkify-it';

import { RenderTextCallbackType } from '../../types/Util';
import { isLinkSneaky } from '../../../js/modules/link_previews';
import { updateConfirmModal } from '../../state/ducks/modalDialog';
import { shell } from 'electron';
import { MessageInteraction } from '../../interactions';

const linkify = LinkifyIt();

interface Props {
  text: string;
  /** Allows you to customize now non-links are rendered. Simplest is just a <span>. */
  renderNonLink?: RenderTextCallbackType;
}

const SUPPORTED_PROTOCOLS = /^(http|https):/i;
const HAS_AT = /@/;

export class Linkify extends React.Component<Props> {
  public static defaultProps: Partial<Props> = {
    renderNonLink: ({ text }) => text,
  };

  public render() {
    const { text, renderNonLink } = this.props;
    const results: Array<any> = [];
    let count = 1;

    const matchData = linkify.match(text) || [];
    let last = 0;

    // We have to do this, because renderNonLink is not required in our Props object,
    //  but it is always provided via defaultProps.
    if (!renderNonLink) {
      return;
    }

    if (matchData.length === 0) {
      return renderNonLink({ text, key: 0 });
    }

    matchData.forEach((match: { index: number; url: string; lastIndex: number; text: string }) => {
      if (last < match.index) {
        const textWithNoLink = text.slice(last, match.index);
        results.push(renderNonLink({ text: textWithNoLink, key: count++ }));
      }

      const { url, text: originalText } = match;
      if (SUPPORTED_PROTOCOLS.test(url) && !isLinkSneaky(url) && !HAS_AT.test(url)) {
        results.push(
          <a key={count++} href={url} onClick={this.handleClick}>
            {originalText}
          </a>
        );
      } else {
        results.push(renderNonLink({ text: originalText, key: count++ }));
      }

      last = match.lastIndex;
    });

    if (last < text.length) {
      results.push(renderNonLink({ text: text.slice(last), key: count++ }));
    }

    return results;
  }

  // disable click on <a> elements so clicking a message containing a link doesn't
  // select the message.The link will still be opened in the browser.
  public handleClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();

    const url = e.target.href;

    const openLink = () => {
      void shell.openExternal(url);
    };

    window.inboxStore?.dispatch(
      updateConfirmModal({
        title: window.i18n('linkVisitWarningTitle'),
        message: window.i18n('linkVisitWarningMessage', url),
        okText: window.i18n('open'),
        cancelText: window.i18n('copy'),
        showExitIcon: true,
        onClickOk: openLink,
        onClickClose: () => {
          window.inboxStore?.dispatch(updateConfirmModal(null));
        },

        onClickCancel: () => {
          MessageInteraction.copyBodyToClipboard(url);
        },
      })
    );
  };
}

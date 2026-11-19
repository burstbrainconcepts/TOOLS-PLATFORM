import React from 'react';
import data from './data-money.json';
import { makeVideo } from './Video';
import * as V2 from './Scenes2';
import * as V3 from './Scenes3';

export const MoneyVideo = makeVideo(data as any, (kind, f, e) => {
  switch (kind) {
    case 'hook': return <V3.MHook f={f} />;
    case 'check': return <V3.MCheck f={f} />;
    case 'begin': return <V3.MBegin f={f} />;
    case 'debit': return <V3.MDebit f={f} />;
    case 'rollback': return <V3.MRollback f={f} />;
    case 'commit': return <V3.MCommit f={f} />;
    default: return <V2.Outro2 f={f} {...e} lock />;
  }
});
export const moneyData = data;

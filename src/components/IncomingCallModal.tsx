import React from 'react';
import { Phone, PhoneOff, Video, ShieldCheck, Heart, Users, Sparkles } from 'lucide-react';
import { CallType } from '../types';

interface IncomingCallModalProps {
  callType: CallType;
  callerName: string;
  callerAvatar: string;
  isSquadCall?: boolean;
  groupName?: string;
  onAccept: () => void;
  onDecline: (reason?: string) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  callType,
  callerName,
  callerAvatar,
  isSquadCall,
  groupName,
  onAccept,
  onDecline,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        id="incoming-call-modal"
        className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-3xl shadow-2xl border border-slate-800 p-8 text-center text-white overflow-hidden relative"
      >
        {/* Animated Background Rings */}
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full ${isSquadCall ? 'bg-indigo-500/10' : 'bg-rose-500/10'} animate-ping duration-1000 pointer-events-none`} />
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full ${isSquadCall ? 'bg-purple-500/5' : 'bg-pink-500/5'} animate-pulse pointer-events-none`} />

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-400 text-xs font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isSquadCall ? 'Squad Mesh' : 'Encrypted'} {callType === 'video' ? 'Video' : 'Audio'} Call</span>
        </div>

        {/* Partner/Caller Avatar with Pulse */}
        <div className="relative inline-block mx-auto mb-4">
          <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${isSquadCall ? 'border-indigo-500 shadow-indigo-500/30' : 'border-rose-500 shadow-rose-500/30'} shadow-xl`}>
            <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
          </div>
          <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full ${isSquadCall ? 'bg-indigo-600' : 'bg-rose-600'} border-2 border-slate-900 flex items-center justify-center text-white`}>
            {isSquadCall ? <Users className="w-4 h-4 text-white" /> : <Heart className="w-4 h-4 fill-white" />}
          </div>
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-bold text-white font-serif">{callerName}</h3>
        {isSquadCall && groupName && (
          <p className="text-indigo-300 text-xs font-semibold mt-0.5">{groupName}</p>
        )}
        <p className="text-slate-400 text-xs mt-1 animate-pulse">
          {isSquadCall
            ? `Inviting you to Squad ${callType === 'video' ? 'HD Video' : 'Voice'} Call (Max 5 friends)...`
            : `Incoming ${callType === 'video' ? 'HD Video' : 'Private Audio'} Call...`}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 mt-8">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="btn-decline-call"
              onClick={() => onDecline()}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-xs text-slate-400 font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="btn-accept-call"
              onClick={onAccept}
              className={`w-16 h-16 rounded-full ${isSquadCall ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/40' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/40'} active:scale-95 text-white flex items-center justify-center shadow-xl animate-bounce transition-all cursor-pointer`}
            >
              {callType === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </button>
            <span className={`text-xs ${isSquadCall ? 'text-indigo-400' : 'text-emerald-400'} font-semibold`}>
              {isSquadCall ? 'Join Call' : 'Accept'}
            </span>
          </div>
        </div>

        {/* Quick decline replies */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex justify-center gap-2">
          <button
            onClick={() => onDecline("Can't talk right now, I'll text you 💕")}
            className="px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer"
          >
            "Can't talk now"
          </button>
          <button
            onClick={() => onDecline('Joining in 5 minutes!')}
            className="px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer"
          >
            "Joining in 5m"
          </button>
        </div>
      </div>
    </div>
  );
};


'use client';

import { useState, useEffect } from 'react';
import { useLoginStatus, getQRCode, logout } from '@/lib/api';
import { Card, Button, Badge } from '@/components/ui';

export default function LoginPage() {
  const { data: loginData, isLoading, mutate } = useLoginStatus();
  const [qrUrl, setQrURL] = useState<string | null>(null);
  const [qrExpiry, setQrExpiry] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = loginData?.status === 'active';

  // Fetch QR code on mount or when needed
  const fetchQRCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getQRCode();
      setQrURL(result.qrUrl);
      setQrExpiry(new Date(result.expireAt));
    } catch (err) {
      setError('获取二维码失败，请重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch QR code when not logged in
  useEffect(() => {
    if (!isLoggedIn && !qrUrl) {
      fetchQRCode();
    }
  }, [isLoggedIn, qrUrl]);

  // Check QR expiry
  useEffect(() => {
    if (qrExpiry && new Date() > qrExpiry) {
      setQrURL(null);
      setQrExpiry(null);
    }
  }, [qrExpiry, loginData]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      mutate();
      setQrURL(null);
    } catch (err) {
      setError('登出失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQR = () => {
    setQrURL(null);
    setQrExpiry(null);
    fetchQRCode();
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">登录绑定</h1>
        <p className="text-gray-400 mt-1">扫描二维码绑定抖音账号</p>
      </div>

      {error && (
        <Card className="border border-red-500/50 bg-red-500/10">
          <div className="flex items-center gap-3">
            <AlertIcon className="w-5 h-5 text-red-500" />
            <span className="text-red-400">{error}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Card */}
        <Card title="抖音登录二维码">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-douyin-primary" />
            </div>
          ) : isLoggedIn ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckIcon className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-green-400 text-lg font-medium mb-4">账号已登录</p>
              <Button
                variant="danger"
                onClick={handleLogout}
                loading={loading}
              >
                退出登录
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              {qrUrl ? (
                <>
                  <div className="inline-block p-4 bg-white rounded-lg mb-4">
                    {/* QR Code placeholder - in real app, render QR image */}
                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                      <QRCodeIcon className="w-32 h-32 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">
                    请使用抖音 APP 扫描二维码登录
                  </p>
                  {qrExpiry && (
                    <p className="text-gray-500 text-xs">
                      二维码有效期至: {qrExpiry.toLocaleTimeString('zh-CN')}
                    </p>
                  )}
                </>
              ) : (
                <div className="py-12">
                  <p className="text-gray-400 mb-4">请获取登录二维码</p>
                  <Button onClick={handleRefreshQR} loading={loading}>
                    获取二维码
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Status Card */}
        <Card title="登录状态">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <span className="text-gray-400">当前状态</span>
              <Badge variant={isLoggedIn ? 'success' : 'warning'}>
                {isLoggedIn ? '已登录' : '未登录'}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <span className="text-gray-400">登录方式</span>
              <span className="text-white">二维码扫码</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <span className="text-gray-400">会话状态</span>
              <Badge variant={isLoggedIn ? 'success' : 'default'}>
                {isLoggedIn ? '活跃' : '离线'}
              </Badge>
            </div>
          </div>

          {!isLoggedIn && (
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-medium">登录说明</p>
                  <ul className="text-gray-400 text-sm mt-2 space-y-1">
                    <li>1. 点击获取二维码按钮</li>
                    <li>2. 打开抖音 APP 扫描二维码</li>
                    <li>3. 在手机上确认登录</li>
                    <li>4. 登录成功后自动跳转</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Instructions */}
      <Card title="使用说明">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-douyin-primary/20 flex items-center justify-center">
              <span className="text-douyin-primary text-xl font-bold">1</span>
            </div>
            <h4 className="text-white font-medium mb-2">获取二维码</h4>
            <p className="text-gray-400 text-sm">点击按钮获取抖音登录二维码</p>
          </div>

          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-douyin-primary/20 flex items-center justify-center">
              <span className="text-douyin-primary text-xl font-bold">2</span>
            </div>
            <h4 className="text-white font-medium mb-2">扫码登录</h4>
            <p className="text-gray-400 text-sm">使用抖音 APP 扫描二维码并确认</p>
          </div>

          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-douyin-primary/20 flex items-center justify-center">
              <span className="text-douyin-primary text-xl font-bold">3</span>
            </div>
            <h4 className="text-white font-medium mb-2">开始使用</h4>
            <p className="text-gray-400 text-sm">登录成功后即可使用全部功能</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Icons
function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function QRCodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

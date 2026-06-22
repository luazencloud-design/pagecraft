'use client'

import { useState, useEffect } from 'react'
import { useProductStore } from '@/stores/productStore'
import { useImageStore } from '@/stores/imageStore'
import { useEditorStore } from '@/stores/editorStore'
import { useApiKeyStore } from '@/stores/apiKeyStore'
import { useAuthStore } from '@/stores/authStore'
import { showToast } from '@/components/ui/Toast'

export default function Header() {
  const [isDark, setIsDark] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const { apiKey, setApiKey, clearApiKey } = useApiKeyStore()
  const [draftKey, setDraftKey] = useState('')

  const { loggedIn, name, trial, fetchMe, logout } = useAuthStore()
  useEffect(() => { fetchMe() }, [fetchMe])

  useEffect(() => {
    if (showPanel) setDraftKey(apiKey)
  }, [showPanel, apiKey])

  const { resetProduct } = useProductStore()
  const { resetAll: resetImages } = useImageStore()
  const { resetEditor } = useEditorStore()

  useEffect(() => {
    const saved = localStorage.getItem('pagecraft-theme')
    if (saved) {
      const dark = saved === 'dark'
      setIsDark(dark)
      if (!dark) document.documentElement.classList.add('light')
      else document.documentElement.classList.remove('light')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
      if (!prefersDark) document.documentElement.classList.add('light')
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('pagecraft-theme')) {
        setIsDark(e.matches)
        if (!e.matches) document.documentElement.classList.add('light')
        else document.documentElement.classList.remove('light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.remove('light')
      localStorage.setItem('pagecraft-theme', 'dark')
    } else {
      document.documentElement.classList.add('light')
      localStorage.setItem('pagecraft-theme', 'light')
    }
  }

  const handleReset = () => {
    if (!window.confirm('모든 작업을 초기화할까요?\n입력한 내용과 이미지가 모두 삭제됩니다.')) return
    resetProduct()
    resetImages()
    resetEditor()
  }

  const saveKey = () => {
    setApiKey(draftKey)
    showToast(draftKey.trim() ? 'API 키 저장됨' : 'API 키 삭제됨')
    setShowPanel(false)
  }

  const hasKey = apiKey.trim().length > 0
  const maskedKey = hasKey ? `${apiKey.slice(0, 6)}••••${apiKey.slice(-4)}` : ''

  return (
    <header
      className="shrink-0"
      style={{
        height: 48,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        zIndex: 100,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABKCAMAAAA2eZm0AAADAFBMVEVHcEw6JrU9JLYKHlMsIJkxG6BAJrpGKb8gnfIhmfIglvIipvMsPaY4HqQ7IrNCJLdHJbohnPIfkfI1Iag3IaZkaIxMJ71ZKcMwIKp2MdBSJ79PMMgjqfNyL808I7MyIaIsIJcfjfAeg+4agd05IalMLMQotvMmsvMdfewgn/MaedIZYs03Kbs5IKtmLMlgK8YfYt4krvMxN8UxNMQ3QdJqLcpHNbhDIrA+IrIfiPBEL8YgZeBbLso8KLsfbuUfeOo5I680Iq00JKo/LMIhW9s4MME5HapIMspgKL8el+8akOY/IrQfc+g0LcA7IK9LKbxHI7hWLcc2Os1kSNEhX909IasyNr0gjOAZjOQ6JK4diuchaeM5I7MuNrr+9EYZcNwcj+cjnvJiRc8vKbhTIrZ7M9NtLss1SdYbT8cxPb04IKstO8k3H6xlLcg/IbIdZt8wM78/Iq4uPMn/7zwjqvAXfORbKMEdiOEZb9o3JbAZZ9tGP9QhT8IblOwjidz6pzBtLcsSHEQkUs43Nr1XL8gbiOwdkudOKL4/J7MqUdf/8gAhofT/8gAbg+MajuQxU9xdQswbK10ZW9JMOL44MrwuMb1DO9EYf98lRMVOKsNGJbsKGkkKHE/8/f8QIlf+3o0ZeucfmuoKEzUKFj4bfuobYdIpMrgZZNb5xXEJFj9CUYxLP8MfXNg0N8f/8gD/8gD/8gAfofH/8gAJFkAemvAKEjAIFkEiqO89TIX9wVsaWNEXheUfke4ko+0bd+IMEi8yTtohpe5FVJAipfAsNMAfVtZJQdYbkeMeaOH/8gD/8gA2Pcv/8gAuWd4hoer22KQjrPIfj+khYd7/8gBTPMT/8gD/8gD/8gAKFTz/8gD9xGPInVEccuVgR9D15MEciem+veUcmev/8gD/8gDuz6KGddn69OaWid0eX95XP8b/8gBsbsJ4X9ejpdSqn+X6tE3/8gD/8gD94LD83p3/8gA8NcpAOc8govRHNLg4McYhM2ouPXL+0nUzQ339uEfq6vcG3OYOAAAA93RSTlMA/v7+Bzb+/v7+/v4EGP/+/f7+HSUB/f0//f3+/v78EQv+/hwt/f7+/v8IDP5s/vz+/f7+/v79l9L9/P7+/P7+iVZP/f/st/3o6L7a/v7m3ub+/v7+X4UVKEiZ/vI6BmmE/f3ssvz8/S4jrP7E/LTk2H7mC96z2jxco7X+FdgQ/tfBtHbb7nHDyNl6/e9tS/39/pP9tMD+M0by9dvs/vv+2pMtVu49Y0ucc/6nz/Q3+b/xH5H1G6n0/vpy1fevnBH+xv7T8+f+VvNZi80o/HorzrDyFv62rkdCmdL48+lI3v2n42pl+hb79vzgy/3z/vzS3I/Y///+G3+i5AAAEEdJREFUeNrs2QlQU3ceB/DMEORKxsBLIBKYhKvhGLDp4gYQFXAUUKYJUE4XBEoRmAkKItRCsZUKaoQFRRQ8WS8UFbFuqSugLLO1XnhVW++jHrv16HYXdFXU/f3+LwcJCJFO2dmZfDHw8t4zEz75/3//33swGMYYY4wxxhhjjDHGGPN/nPnzjQYGZ/lyo4GhSd63L9moYGD2/3R7v1HBwHzf3Py9UcHQktXTYyxahpasCz09F3lGB0Oo9h5f0dOz4vheY40fLuePXQQqzIqLx84bPYYuV809mjQbC5d+WPfunNY84Z0/dkE9si4YR9bAS5vGg5ev93++95KxZr0hpxsP9vX9+7QBqyHT1VQVod4RofoAd0RrKMs0tqmplGvAmSWFlWWJmJSKQpf/gdXlV32bNvU1GtBnscvD6BR46x3xVh0Ik7JG8BZ42+fVfvNN0WrX4UwLy86Gt1laW6dCDoTPSKlkja7VHWJ18NXl08N38OzPPlLlM91R4Ko+MC6dOYL3EJJXVFQEWjXsIU8rTPzUkjjReao0D08sHEWue/86SKwWLTp4Z/hrQ8Qah/koI1fnQIzjOFVGgsVaWFtEtPYkDHGW5+wbFtbwZZEKI0tt5hFeNmpaybTVq0WLLl/nDX/XAbDUKAX9pww7fdyvwfLMri2qRa89IW8+qbhjiaWFNtbW1ubmoKUMTxyt0nXnZ7DqA6vG0/rdlrpk8ZJ5/bDQwxGHUUZMv5P5GY4YPDYSLF7unlqSeW8uWqzZ/jaWGJSypLVSU4FLaZEYNyrjKuGK2mrAfVHNndJ71+/1x3KkXRzHSTUqPKbUUZMR1Syqpre29knvvCFm4eytTk42NujVtmQGLIYzlrRZwMAyNzdXWqeMxlXsD+teXNnU9/NgVv1J+48sx4yMDHxkOIbxtQMrzJHsyxgpFoNbunre6tghFsPMzf7+Tm2g5XSoYpsLi8Fy2fbxWUtzaxxfyvA1v73VlnXV1dVXhrOCkbN/vg4WHYVU3WsxczMyJmBg74SRYTF4bIo9RKX2XOkOWJAlHWvUnx2vOCXcGio+VPsFv/lE3LL++a4XJtVXFjUO06gnXzymwUIlhWLCBIUiI0w9aVwLFD4+PhPoaLBEQjbF5VKUUFePJ2JTWRRbpDtzBswjHlNIZWVlUcUi1cBydnYGLucOr/51rCLcmhT7tkr8Lzz1N884F0icpx54Ce4tGcniydyy/sVfX240Mfm88fowp568fVyDBUoKRZhC4QM/pPQvwgsar0AtH9ynwmKa5qaXf0FSvjBG1K9TD6J3lwe5Mti5sRiYfBTZKNW08KKk2JoTyzC7F8cmwa+3MsLZHbU6inXemSjFkq72iV4Mz4oUSEOZp+fRW51d+fn5Xe1lWllefHf7GdiZf6b96FuvnqydYPXCxMTkq8P0p/Gm6cFjnNzXs2J5sgoLrQqCxkMUCjldY7gFivEkqOWDWCyutEChCAwM9AnE1EnVCMJcmUAQKoBHqEAWzK8LhQRAu2A6rfYJZJqqDHKb8uYc+SPkFGZZJoP5yRR3d9DaukPv7a1ZYkFWyBsuDK8ZlrhEfhqf0mJl5eBgJZE4tDaop6dXWb5Y/A4dcWeZ11tZiXZufEmsvjw82FF+MF87Gk5eav7lGO3JJi4F/PTxdvDTjr7mCYZtO7swaRgRQ6yQLwJ1EllOa5mW1wkCBepMKw/VwaqtpbF420/4zsEcOYJip/6WySjePWWKO3gt0P8tvRKBCpbI8EKG1wILDyX09O1gRbQc4HGrhJzm0i4BJLXWO60Nb6N1+MuNL3c9RyvRIEeFTY9uPorVHjn/y3KGGgs9wrjediRL0UCYTrbTEwiWHWIl1BEidWAziLxutkAQqaYKFYSG6mI9UWEF5/lC5tBeoLUsi5E5N2IKZuXAjsLJEhuKAxWIZe7hYQ6Lo9VTKzoODi1H8aS4W2K0UmHBj9YUT4Ot/vxV9ddotXHnYEsXz/vmhg0bHmmbzuRL6stEwAIXmSt3Ka2F5wTX45Z9jGsYjQYvKcyJjLSrk8tkfrI6wBJERpbDRR8rt452CqiT+c2scwMnLdaTJ70qLP48pEIs37w8mI5HFnsx1n4bgVpX/zLgze7YakOSyAIs6Omhr09VtrS0KGktqwb4lFkpEhASiyX5nZ04G+Ff61HDrZ7v2lVtYrJ+56ArA3Pxa8B6/YCdtTZL1aAma7DsCBbD255kOpshyiFbfhRXZmcPaDnoH1IvX5jgSlEUN0buBomsg5WTLxcI8IlbtinFpvg5ASRqrF5VzWLW+NIDKy82KSvLNSk2L9YTsCZPjoiIuLpjwJvdthUbChubBYBFXw1ZHzhbWVh59oCVEodWOwyhQhACqpbu+Li4+O5WfCJuLzHM6k+fP9/1tb7V/r3aOfpgA+b+iWvRTXqzFLDs7RHLVG5vC19yUyAgWLkMroxsECzK21Q1ZnkhMvSxlfIY3maEyk1K31pgSwEKQ7B6IQQriUxCX98Ta+lX8OJmshhrz02GRMzdNhBrM2I5tREsUuvbUtChJJGMLUknlPhuiUQiFreWkann2QDbEnHLGkOtSMuwfmf/RfDHfZrGlP3g9c3H9+/ejI6Ovpakd1mCWPawCrKkthh7qTCbbJRTOlg87ccgKidY2SymlLbyo9TtmR89toJ1sIKioqLAKk/nymftuVmzQGvuYCPL3x/bVcSirx1n0CvgmnAr5VMrhy4XhkunBLU6VR1DZasYuSoNu8RRWW3R2X1pxUm6uCeVNt19XAV5fDctOq1UH8ve3tYWW4YEORBxOHJvOYdja1ufC+v9TMI2XTWkoKk0jQkKkkrlZjCizHJY3JluZpggTZ0MmopWUzVYvYDFqonyRa1YnQqRdG7iLOD6dpCaddUf+y//DsRCLZsU+oDLjadPASs/nlHYAl2ExKE7jqSkMJ/YdRt0ifOctAx6Vif/2fMjFqbipmvRaffvV0VHpz18mJZWVaM7DykZWBEsppQDVqCF32z9uHpYIv7CpTJZnZuZrRmdHJarnGzYBmteLThgKkaF9YxgCVdH4dDK0x3SmXMnTkSugavhx9B9oRauhnSpr1BhHYJGQmkFWJWtEugiHPK7urrOQLpa0U7cMPwV2BZVK7pOx2r+8Z/wTzlQtqhrMPkewpiKToNH1XfTdN80W2arwoJJxFGnngMViUH54TEOweJmy8kwUlMhFpfGqtfcsuKFBEwN0GA9e/as90M+I+sEYkXl6d6IFe5+913k+qRYv7fucCZZgn0W3pWwaZutuv11yCMVuohwwFKiFVZ7BxxT8B03Ggxp20l7te4H3dsxx2/39DTvAyxWEzABFEnVqlWrSgdgwWgyxW0phzN2LGcsas3EHRSth1jUdA6wcDhj6iG4aTZGg8XRtiTBU7Uj6xliTSNY7w3EYi7+4APgmvX37QNuRrhjnDfHAxa50vafrR5Z0M6beyBWKmkjcFbSvaqmpxjycvANVvAh4zTECs8r/a6qikBVVf1j1e9X/adGpxOjZqLH+wQr5g+ARQcHlgprLGCJpGREcd6f7s3nJywdM8lsEmCxl+LOSWbZIm3NwkxCrA8R63f0NHwPskdvZSk9RbQm7s7U3b9yCsH6b7v289JGGsYBfGZMUrdMEtxkIKdJVudQzQRKLc0sZZZJ1goajZem1TKipRfzA3/sRSNGMEVJKe5Sq1S6sLTdrWXBnmqL2MJelHrZw5Ye97K37R+waAsL+zzvO5MfmphK2V0P8+0lP0woH5/3fZ/3fT0D++vgNJnq50tY0EYg1uQGwcp1V2SxzhYH2nZsGQ5blU3wA1BNd9++fffu7d0LmD7pEJabYvlTphUpLMByux1uxJLipKw67Xi0wI86VIfDMWoTtFMqPDpFP00GMlDJRaze9+9v4ATf3v4XYFVO8Ezy1mWidXmp/A5OmBojjf0ZbMCC0zjRfzk/ZWLhoWoTYJF18fbecFt5bELdLQ61elTlXbN1SPZRJCP7+2uVWG5RNLCYaNzNcfBUpHcXiOV2c4A1cN8NKjqdyQMZBwZeTrjJIzVDP+7NqqoqF7F6e3sRi9HaMeduRCo28/yV7zo6kOvP/EiRMbg1Bp0qtPY907MEC2b65iLWA9J1AVZL9x7M9Xu5fuYYW5wfNjehZWiYq2ZVbEoDy/slqP1LBU06hCUaWLaUC6xELuY1scAOsSL3kUWnRwj2GAdP8GUvZVMdSmjA50tkVPVr+KdSrF4MYknjRKt9fM0v0POvwTXozGbyHb92kOra2RqZsfG2YPLJEu3re3rGcHASrObmnw5hMQtN12EP9NkfJa22/tl628G/a1uV1oArptSF8Wxo8MDFcwUWMxB3YcKCgYV0LlCJ3hcBRSQNlbeTM7GYiO5gWQfwqLquqySyfBCLz9LSSm+v3PQNDg7eXPmG9BHSrY4OqnV2Z31paSm//gb7VOTaJdNUcBoPccqwyIk9YAn3cq2NjbDFzr1ugSaen+2fHH55VE/qnbuziS1DPSuYtwlU3/LEgIc/dIDpiYllWAGtM5VKZY3acyouA8uuQ71xnB6ORkOKA8rNwApkXRzHqqxqREcs+QAWIxUIFmQb8vRp+vzTVdLF7xAswnXxIu27gKvnq92loIkFXCUs3DKexuN5YXGjkWyxN3IPFxaGu3MbG6cXjt4OfiBWz+sNV6nvUiEc8VY/SXfGuDIshicx38uYWM5OjoxPTtShrOARy3EZXAM9YXiRJeFUtqCpKivLIsWSZQNLsI8bWJg0Zo22ZVhbRnFRL7oH2qLHLQGCdaYcC7Tmcey1DW+0Xm/CxXFvr7UVz3FaH7YdYbVJrF7UtWJsvoNj73Bl+aq95zewQCUSp1hoFivo+EghX+rXYqKBpY/6IoDFymzUwJIpFjxbvmRqpdPn0ufTtNkTBvM7lOssDWBd3J0294tBcppaifXF5/Nkwzx7rasRT+vxWrbxelNT0+2Xtc6Wn881fLjzkVZHx1kfKwMqfCRGZjPOJSo+mNk4zmVWo1dT4qKoxzOJADOBWKxIsGSMbuyeA9GV7fZSZY2vmpcYq/mdIhaW1pv8VPHMMzBN2ojfzT7rAb0NoqcL/LfdrwgWpBWwumpezP7YQPPil0+9EAokQpBE1T/f4KP4XiiC402QtIwSi8UyExLjJ58JScU7L3skEZGA1N8pY40ho3+N/EwoWbyrj2grK+OYlexastRzBR9v5dfXxzDr6/mt1bJBwD8ZIjHa1uDU0OLi0NCUidLy+lp3LtfVlcvlun8bnqx5rvzoe2L17JOtjuXq9HicgSOXEh2mLJbFUqzSIQo2P3wDfAVfeX8CTcNMcuTx45EZ/8fcUJa+WeCDV1v67/W3XJ1tO/qo4T+3qrEoly0cUobFUchOHP8iT/hXr+sfPZv7OfD/WwnheDhix2bT5k0odKYvLq0nJ0LgJPwvbCmYz+OjYU3LKsaqKGo2xkq135inADpk7LlYAyvlsVyqxx53GfXEUiw95bVUarVpE4rOlqJnQn4LpfZAdA5o2dGCoiiFzlQ44bRE6oHZ/F4peaB/smLFihUrVqxYsWLFihUrVk5A/gEFnvl5li0YlQAAAABJRU5ErkJggg==" alt="MagicOne" style={{ height: 50, objectFit: 'contain', flexShrink: 0 }} />

      <div style={{ flex: 1 }} />

      {/* 초기화 버튼 */}
      <button
        onClick={handleReset}
        style={{
          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: '#0c0c10',
          background: 'var(--accent)', padding: '3px 10px', borderRadius: 4,
          border: '1px solid var(--accent)', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
      >
        ↺ 새 작업
      </button>

      {/* 테마 전환 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
          {isDark ? '🌙 다크' : '☀️ 라이트'}
        </span>
        <div
          onClick={toggle}
          style={{
            width: 36, height: 20, borderRadius: 10, background: 'var(--surface3)',
            border: '1px solid var(--border2)', cursor: 'pointer', position: 'relative', flexShrink: 0,
            transition: 'background 0.2s, border-color 0.2s',
          }}
        >
          <div
            style={{
              position: 'absolute', top: 2, left: 2, width: 14, height: 14, borderRadius: '50%',
              background: isDark ? 'var(--text2)' : 'var(--accent)',
              transition: 'transform 0.2s, background 0.2s',
              transform: isDark ? 'translateX(0)' : 'translateX(16px)',
            }}
          />
        </div>
      </div>

      {/* 계정 / 무료 체험 — BYOK 키 있으면 숨김 (그땐 무제한) */}
      {!hasKey && (
        loggedIn ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAccount(!showAccount)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, height: 28, padding: '0 12px',
                borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text2)',
              }}
              title={name || ''}
            >
              🎟️ {trial ? `${trial.remaining}/${trial.limit}` : '체험'}
              {trial && trial.active ? <span style={{ color: 'var(--text3)', fontWeight: 500 }}>· {trial.daysLeft}일</span> : null}
            </button>
            {showAccount && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowAccount(false)} />
                <div style={{ position: 'absolute', top: 38, right: 0, zIndex: 200, width: 260, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px', wordBreak: 'break-all' }}>{name || '무료 체험'}</p>
                  <p style={{ fontSize: 10, color: 'var(--text3)', margin: '0 0 12px' }}>초대 체험 계정</p>

                  {trial && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                        <span>잔여 크레딧</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{trial.remaining} / {trial.limit}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${(trial.used / trial.limit) * 100}%`, background: trial.remaining <= 50 ? 'var(--red)' : 'var(--accent)' }} />
                      </div>
                      <p style={{ fontSize: 10.5, color: trial.active ? 'var(--text3)' : 'var(--red)', margin: '0 0 12px' }}>
                        {trial.active ? `체험 ${trial.daysLeft}일 남음` : '체험 기간 종료'}
                      </p>
                    </>
                  )}

                  <p style={{ fontSize: 10.5, color: 'var(--text3)', margin: '0 0 10px', lineHeight: 1.6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    체험이 끝나면 ⚙️ 설정에서 본인 Gemini API 키를 입력해 무제한으로 쓸 수 있어요.
                  </p>
                  <button
                    onClick={async () => { await logout(); setShowAccount(false); showToast('로그아웃됨') }}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer' }}
                  >
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null
      )}

      {/* API 키 설정 */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowPanel(!showPanel)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 28, padding: '0 12px', borderRadius: 6,
            fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            background: hasKey ? 'var(--surface2)' : 'rgba(255,200,60,0.12)',
            border: `1px solid ${hasKey ? 'var(--border2)' : 'rgba(255,200,60,0.5)'}`,
            color: hasKey ? 'var(--text2)' : 'var(--accent)',
          }}
          title="Gemini API 키 설정"
        >
          ⚙️ {hasKey ? 'API 키' : 'API 키 입력'}
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: hasKey ? 'var(--green)' : 'var(--red)',
          }} />
        </button>

        {showPanel && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowPanel(false)} />
            <div
              style={{
                position: 'absolute', top: 38, right: 0, zIndex: 200, width: 320,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
                Gemini API 키
              </p>
              <p style={{ fontSize: 10.5, color: 'var(--text3)', margin: '0 0 12px', lineHeight: 1.6 }}>
                본인 Google AI Studio API 키를 입력하면 모든 AI 기능을 사용할 수 있어요.
                키는 <b style={{ color: 'var(--text2)' }}>브라우저에만</b> 저장되며 서버에 보관되지 않습니다.
              </p>

              <input
                type="password"
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder="AIza..."
                spellCheck={false}
                autoComplete="off"
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 7,
                  fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text)',
                  background: 'var(--surface2)', border: '1px solid var(--border)', outline: 'none',
                }}
              />
              {hasKey && (
                <p style={{ fontSize: 10, color: 'var(--text3)', margin: '6px 0 0', fontFamily: 'var(--mono)' }}>
                  현재 저장됨: {maskedKey}
                </p>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button
                  onClick={saveKey}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                    background: 'var(--accent)', border: 'none', color: '#0c0c10', cursor: 'pointer',
                  }}
                >
                  저장
                </button>
                {hasKey && (
                  <button
                    onClick={() => { clearApiKey(); setDraftKey(''); showToast('API 키 삭제됨') }}
                    style={{
                      padding: '8px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text2)', cursor: 'pointer',
                    }}
                  >
                    삭제
                  </button>
                )}
              </div>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', marginTop: 12, fontSize: 11, color: 'var(--accent)',
                  textDecoration: 'none', textAlign: 'center',
                }}
              >
                ↗ Google AI Studio에서 API 키 발급받기
              </a>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

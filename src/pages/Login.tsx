import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/use-toast'
import { Loader2, ArrowLeft, Home, BarChart3 } from 'lucide-react'

export function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const success = await login(identifier, password)
      if (success) {
        toast({
          title: 'Login successful',
          description: 'Choose where you want to go next!',
        })
        setIsLoggedIn(true)
      } else {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: 'Invalid credentials or insufficient permissions',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Network error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            {isLoggedIn ? 'Login successful! Choose your destination' : 'Sign in to access the coupon editor'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoggedIn ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or Username</Label>
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Where would you like to go?
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  className="w-full justify-start"
                  variant="outline"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
                <Button 
                  onClick={() => navigate('/coupon-editor')} 
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Coupon Editor
                </Button>
                <Button 
                  onClick={() => navigate('/')} 
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}